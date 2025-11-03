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
        <Stream url="wss://${req.get('host')}/websocket">
            <Parameter name="callId" value="${callId}" />
        </Stream>
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
    path: '/websocket',
    perMessageDeflate: false,
    handleProtocols: () => 'audio'
  });

  console.log('🎙️ WebSocket server setup for realtime voice at /websocket');

  wss.on('connection', async (ws, req) => {
    console.log(`🔌 WebSocket connection attempt from URL: ${req.url}`);
    
    const urlParts = req.url.split('/');
    const urlObj = new URL(req.url, 'http://localhost');
    let callId = urlObj.searchParams.get('callId') || urlParts[urlParts.length - 1];
    
    console.log(`🔌 WebSocket connected for call ${callId} from URL: ${req.url}`);
    DebugLogger.logSuccess('WebSocket connected for call', { callId });

    try {
      let streamSid = null;
      let call = null;

      // Handle Twilio WebSocket messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
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
              // Prefer callId from custom parameters if present
              if (data.start.customParameters) {
                let callIdFromParams = null;
                if (Array.isArray(data.start.customParameters)) {
                  const found = data.start.customParameters.find(p => p.name === 'callId');
                  callIdFromParams = found ? found.value : null;
                } else if (typeof data.start.customParameters === 'object') {
                  callIdFromParams = data.start.customParameters.callId || null;
                }
                if (callIdFromParams) {
                  callId = callIdFromParams;
                  console.log(`🔖 Using callId from customParameters: ${callId}`);
                }
              }
              // Fetch call/lead now
              call = await prisma.call.findUnique({
                where: { id: callId },
                include: { lead: true }
              });
              if (!call) {
                console.error(`❌ Call not found for callId ${callId}`);
                ws.close(1000, 'Call not found');
                return;
              }

              // Capture Twilio media format (encoding/sampleRate)
              try {
                const mf = data.start.mediaFormat || data.start.media || {};
                if (mf.encoding || mf.sampleRate) {
                  realtimeService.setMediaFormat(callId, mf.encoding, mf.sampleRate);
                  console.log(`🎚️ Media format: encoding=${mf.encoding} sampleRate=${mf.sampleRate}`);
                }
              } catch (e) {
                console.warn('⚠️ Unable to set media format from start event');
              }

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

      ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed for ${callId}: code=${code} reason=${reason?.toString?.() || ''}`);
        DebugLogger.logSuccess('WebSocket closed', { callId, code, reason: reason?.toString?.() || '' });
        realtimeService.endConversation(callId);
      });

      ws.on('error', (err) => {
        console.error(`❌ WebSocket error for ${callId}:`, err.message || err);
        DebugLogger.logCallError(callId, err, 'twilio_websocket');
      });

      // Ensure we respond to Twilio pings promptly
      ws.on('ping', (data) => {
        try { ws.pong(data, false, true); } catch (_) {}
      });
      // Optionally keepalive (server -> Twilio)
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.ping(); } catch (_) {}
        }
      }, 25000);
      ws.on('close', () => clearInterval(pingInterval));

    } catch (error) {
      DebugLogger.logCallError(callId, error, 'websocket_setup');
      ws.close(1000, 'Setup failed');
    }
  });

  return wss;
}

module.exports = { router, setupWebSocketServer };
