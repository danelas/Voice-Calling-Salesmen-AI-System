const express = require('express');
const WebSocket = require('ws');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const OpenAIRealtimeService = require('../services/openAIRealtimeService');
const { DebugLogger } = require('../utils/logger');

const prisma = new PrismaClient();
const realtimeService = new OpenAIRealtimeService();

/**
 * POST /api/realtime-voice/stream/:callId
 * Handle Twilio Media Stream for real-time OpenAI conversation
 */
router.post('/stream/:callId', (req, res) => {
  const { callId } = req.params;
  
  // Return TwiML that starts a media stream to our WebSocket
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://${req.get('host')}/websocket/${callId}" />
    </Connect>
</Response>`;

  res.type('text/xml').send(twiml);
});

/**
 * WebSocket handler for Twilio Media Streams
 */
function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/websocket'
  });

  console.log('🎙️ WebSocket server setup for realtime voice at /api/realtime-voice/websocket');

  wss.on('connection', async (ws, req) => {
    console.log(`🔌 WebSocket connection attempt from URL: ${req.url}`);
    
    const urlParts = req.url.split('/');
    const callId = urlParts[urlParts.length - 1];
    
    console.log(`🔌 WebSocket connected for call ${callId} from URL: ${req.url}`);
    DebugLogger.logSuccess('WebSocket connected for call', { callId });

    try {
      // Get call and lead data
      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: { lead: true }
      });

      if (!call) {
        ws.close(1000, 'Call not found');
        return;
      }

      let streamSid = null;

      // Handle Twilio WebSocket messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          console.log(`📞 Twilio message for ${callId}:`, data.event);

          switch (data.event) {
            case 'connected':
              console.log(`✅ Twilio stream connected for ${callId}`);
              DebugLogger.logSuccess('Twilio stream connected', { callId });
              break;

            case 'start':
              streamSid = data.start.streamSid;
              console.log(`🎬 Media stream started for ${callId} with SID: ${streamSid}`);
              DebugLogger.logSuccess('Media stream started', { callId, streamSid });
              
              // Start OpenAI realtime conversation
              console.log(`🚀 Starting OpenAI realtime conversation for ${callId}`);
              await realtimeService.startRealtimeConversation(callId, call.lead, ws);
              if (streamSid) {
                if (typeof realtimeService.setStreamSid === 'function') {
                  realtimeService.setStreamSid(callId, streamSid);
                } else {
                  ws.streamSid = streamSid;
                }
              }
              break;

            case 'media':
              // Forward audio frame to OpenAI service
              if (data.media && data.media.payload) {
                try {
                  await realtimeService.handleTwilioMedia(callId, data.media.payload);
                } catch (e) {
                  console.error(`❌ Failed forwarding media for ${callId}:`, e.message);
                }
              }
              break;

            case 'stop':
              console.log(`🛑 Media stream stopped for ${callId}`);
              DebugLogger.logSuccess('Media stream stopped', { callId });
              realtimeService.endConversation(callId);
              break;
          }
        } catch (error) {
          console.error(`❌ WebSocket message error for ${callId}:`, error);
          DebugLogger.logCallError(callId, error, 'websocket_message');
        }
      });

      ws.on('close', () => {
        DebugLogger.logSuccess('WebSocket closed', { callId });
        realtimeService.endConversation(callId);
      });

    } catch (error) {
      DebugLogger.logCallError(callId, error, 'websocket_setup');
      ws.close(1000, 'Setup failed');
    }
  });

  return wss;
}

module.exports = { router, setupWebSocketServer };
