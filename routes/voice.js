const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const OpenAIService = require('../services/openAIService');
const TwilioVoiceService = require('../services/twilioVoiceService');
const ElevenLabsService = require('../services/elevenLabsService');
const { DebugLogger } = require('../utils/logger');

const prisma = new PrismaClient();
const twilioVoice = new TwilioVoiceService();
const openAI = new OpenAIService();
const elevenLabs = new ElevenLabsService();

// TwiML routes removed - now using OpenAI Realtime API via WebSocket

// Speech gathering now handled by OpenAI Realtime API via WebSocket

/**
 * POST /api/voice/status/:callId
 * Handle call status updates from Twilio
 */
router.post('/status/:callId', async (req, res) => {
  const { callId } = req.params;
  const { CallStatus, CallSid, CallDuration, AnsweredBy } = req.body;
  
  try {
    let updateData = {
      twilioCallSid: CallSid
    };

    switch (CallStatus) {
      case 'ringing':
        updateData.status = 'IN_PROGRESS';
        break;
      case 'answered':
        updateData.status = 'IN_PROGRESS';
        updateData.startedAt = new Date();
        break;
      case 'completed':
        updateData.status = 'COMPLETED';
        updateData.endedAt = new Date();
        if (CallDuration) {
          updateData.duration = parseInt(CallDuration);
        }
        break;
      case 'busy':
      case 'no-answer':
      case 'failed':
        updateData.status = 'FAILED';
        updateData.outcome = CallStatus.toUpperCase().replace('-', '_');
        break;
    }

    // Handle voicemail detection
    if (AnsweredBy === 'machine_start') {
      updateData.outcome = 'VOICEMAIL';
      
      // Generate voicemail message
      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: { lead: true }
      });
      
      if (call) {
        const voicemailMessage = `Hi ${call.lead.firstName}, this is Sarah from our sales team. I was calling to discuss how we can help ${call.lead.company || 'your business'}. Please call us back at your convenience. Thank you!`;
        
        // Log voicemail (TwiML generation handled by OpenAI Realtime)
        await prisma.interaction.create({
          data: {
            callId: callId,
            speaker: 'AI',
            content: voicemailMessage,
            interactionType: 'VOICEMAIL',
            sentiment: 'neutral',
            timestamp: new Date()
          }
        });
      }
    }

    // Update call in database
    await prisma.call.update({
      where: { id: callId },
      data: updateData
    });

    DebugLogger.logSuccess('Call status updated', {
      callId,
      status: CallStatus,
      duration: CallDuration
    });

    res.sendStatus(200);

  } catch (error) {
    DebugLogger.logCallError(callId, error, 'status_update');
    res.sendStatus(500);
  }
});

/**
 * POST /api/voice/recording/:callId
 * Handle recording completion
 */
router.post('/recording/:callId', async (req, res) => {
  const { callId } = req.params;
  const { RecordingUrl, RecordingDuration, RecordingSid } = req.body;
  
  try {
    // Update call with recording information
    await prisma.call.update({
      where: { id: callId },
      data: {
        recordingUrl: RecordingUrl,
        recordingSid: RecordingSid,
        recordingDuration: RecordingDuration ? parseInt(RecordingDuration) : null
      }
    });

    DebugLogger.logSuccess('Call recording saved', {
      callId,
      recordingDuration: RecordingDuration,
      recordingSid: RecordingSid
    });

    res.sendStatus(200);

  } catch (error) {
    DebugLogger.logCallError(callId, error, 'recording_save');
    res.sendStatus(500);
  }
});

/**
 * POST /api/voice/incoming
 * Handle incoming calls (should redirect to website)
 */
router.post('/incoming', (req, res) => {
  const { From, To } = req.body;
  
  DebugLogger.logSuccess('Incoming call handled', {
    from: From,
    to: To
  });
  
  // Return simple message - incoming calls not supported in realtime mode
  res.status(200).json({
    message: 'Incoming calls not supported. This number is for outbound sales calls only.'
  });
});

/**
 * GET /api/voice/numbers
 * List available phone numbers
 */
router.get('/numbers', async (req, res) => {
  try {
    const numbers = await twilioVoice.listPhoneNumbers();
    
    res.json({
      success: true,
      numbers: numbers
    });
  } catch (error) {
    DebugLogger.logTwilioError(error, 'list_numbers');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phone numbers'
    });
  }
});

/**
 * POST /api/voice/numbers/purchase
 * Purchase a new phone number
 */
router.post('/numbers/purchase', async (req, res) => {
  const { areaCode } = req.body;
  
  try {
    const number = await twilioVoice.purchasePhoneNumber(areaCode);
    
    res.json({
      success: true,
      number: number
    });
  } catch (error) {
    DebugLogger.logTwilioError(error, 'purchase_number', areaCode);
    res.status(500).json({
      success: false,
      error: 'Failed to purchase phone number'
    });
  }
});

/**
 * GET /api/voice/audio/:callId/:type
 * Serve ElevenLabs generated audio for realistic voice
 */
router.get('/audio/:callId/:type', async (req, res) => {
  const { callId, type } = req.params;
  
  try {
    // Get call and lead information
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { 
        lead: true,
        interactions: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!call) {
      return res.status(404).send('Call not found');
    }

    let textToSpeak = '';
    
    if (type === 'greeting') {
      // Use simple, reliable greeting text
      textToSpeak = `Hello, may I speak with ${call.lead.firstName} ${call.lead.lastName}, please? This is from Levco Real Estate Group, a local brokerage here in Hollywood. We are reaching out to homeowners because we have buyers looking in the area and want to know if you are interested in selling.`;
    } else if (type === 'goodbye') {
      textToSpeak = `Thank you for your time, ${call.lead.firstName}. We will be in your neighborhood this week with another homeowner, we can schedule to have one of our top agents meet you at your property as well. Have a great day!`;
    } else {
      // Get the latest AI response for this call
      const latestAiInteraction = call.interactions
        .filter(i => i.speaker === 'AI')
        .pop();
      
      textToSpeak = latestAiInteraction?.content || 'Hello, how can I help you today?';
    }

    // Ensure textToSpeak is a string
    if (typeof textToSpeak !== 'string' || !textToSpeak.trim()) {
      textToSpeak = `Hello ${call.lead.firstName}, this is a call from Levco Real Estate Group.`;
    }

    console.log(`Generating audio for: "${textToSpeak.substring(0, 50)}..."`);

    // Generate realistic audio with ElevenLabs
    const audioBuffer = await elevenLabs.generateSalesAudio(textToSpeak, call.lead);
    
    // Set proper headers for audio streaming
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache'
    });
    
    res.send(audioBuffer);
    
  } catch (error) {
    console.error(`❌ Audio generation error for ${callId}:`, error.message);
    DebugLogger.logCallError(callId, error, 'audio_generation');
    
    // Return a simple audio response instead of crashing
    const fallbackText = `Hello, this is a call from Levco Real Estate Group. We will call you back shortly.`;
    
    try {
      // Try ElevenLabs one more time with simple text
      const fallbackBuffer = await elevenLabs.generateSalesAudio(fallbackText, { firstName: 'there' });
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': fallbackBuffer.length,
        'Cache-Control': 'no-cache'
      });
      res.send(fallbackBuffer);
    } catch (fallbackError) {
      console.error(`❌ Fallback audio generation failed:`, fallbackError.message);
      // Return empty audio to prevent TwiML errors
      res.status(204).send();
    }
  }
});

module.exports = router;
