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
        <Stream url="wss://${req.get('host')}/api/realtime-voice/websocket/${callId}" />
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
    path: '/api/realtime-voice/websocket'
  });

  wss.on('connection', async (ws, req) => {
    const urlParts = req.url.split('/');
    const callId = urlParts[urlParts.length - 1];
    
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

          switch (data.event) {
            case 'connected':
              DebugLogger.logSuccess('Twilio stream connected', { callId });
              break;

            case 'start':
              streamSid = data.start.streamSid;
              DebugLogger.logSuccess('Media stream started', { callId, streamSid });
              
              // Start OpenAI realtime conversation
              await realtimeService.startRealtimeConversation(callId, call.lead, ws);
              break;

            case 'media':
              // Audio data from customer - handled by OpenAI service
              break;

            case 'stop':
              DebugLogger.logSuccess('Media stream stopped', { callId });
              realtimeService.endConversation(callId);
              break;
          }
        } catch (error) {
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
