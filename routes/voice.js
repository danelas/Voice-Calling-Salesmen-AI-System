const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const TwilioVoiceService = require('../services/twilioVoiceService');
const OpenAIService = require('../services/openAIService');
const { DebugLogger } = require('../utils/logger');

const prisma = new PrismaClient();
const twilioVoice = new TwilioVoiceService();
const openAI = new OpenAIService();

/**
 * POST /api/voice/twiml/:callId
 * Generate initial TwiML for call
 */
router.post('/twiml/:callId', async (req, res) => {
  const { callId } = req.params;
  
  try {
    // Get call and lead information
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { lead: true }
    });

    if (!call) {
      return res.status(404).send('Call not found');
    }

    // Generate initial AI greeting
    const initialMessage = await openAI.generateSalesResponse(
      [],
      call.lead,
      'initial_greeting'
    );

    // Generate TwiML
    const twiml = twilioVoice.generateInitialTwiML(
      callId,
      call.lead,
      initialMessage.response
    );

    // Log the interaction
    await prisma.interaction.create({
      data: {
        callId: callId,
        speaker: 'AI',
        content: initialMessage.response,
        interactionType: 'GREETING',
        sentiment: 'neutral',
        timestamp: new Date()
      }
    });

    DebugLogger.logSuccess('TwiML generated for call', {
      callId,
      messageLength: initialMessage.response.length
    });

    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    DebugLogger.logCallError(callId, error, 'twiml_generation');
    
    // Fallback TwiML
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('Sorry, there was an error. Please try again later.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

/**
 * POST /api/voice/gather/:callId
 * Handle customer speech input
 */
router.post('/gather/:callId', async (req, res) => {
  const { callId } = req.params;
  const { SpeechResult, Confidence } = req.body;
  
  try {
    // Get call and conversation history
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

    // Log customer response
    if (SpeechResult) {
      await prisma.interaction.create({
        data: {
          callId: callId,
          speaker: 'CUSTOMER',
          content: SpeechResult,
          interactionType: 'RESPONSE',
          sentiment: 'neutral', // Will be analyzed by OpenAI
          timestamp: new Date(),
          metadata: {
            confidence: Confidence
          }
        }
      });
    }

    // Build conversation history for AI
    const conversationHistory = call.interactions.map(interaction => ({
      role: interaction.speaker === 'AI' ? 'assistant' : 'user',
      content: interaction.message
    }));

    // Add current customer response
    if (SpeechResult) {
      conversationHistory.push({
        role: 'user',
        content: SpeechResult
      });
    }

    // Generate AI response
    const aiResponse = await openAI.generateSalesResponse(
      conversationHistory,
      call.lead,
      'conversation'
    );

    // Analyze if call should end
    const shouldEndCall = aiResponse.shouldEndCall || 
      conversationHistory.length > 20 || // Max 20 exchanges
      aiResponse.response.toLowerCase().includes('goodbye') ||
      aiResponse.response.toLowerCase().includes('thank you for your time');

    // Log AI response
    await prisma.interaction.create({
      data: {
        callId: callId,
        speaker: 'AI',
        content: aiResponse.response,
        interactionType: aiResponse.interactionType || 'RESPONSE',
        sentiment: 'neutral',
        timestamp: new Date()
      }
    });

    // Update call if ending
    if (shouldEndCall) {
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          outcome: aiResponse.outcome || 'COMPLETED'
        }
      });
    }

    // Generate TwiML response
    const twiml = twilioVoice.generateResponseTwiML(
      callId,
      aiResponse.response,
      shouldEndCall
    );

    DebugLogger.logSuccess('AI response generated', {
      callId,
      customerMessage: SpeechResult?.substring(0, 100),
      aiResponseLength: aiResponse.response.length,
      shouldEndCall
    });

    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    DebugLogger.logCallError(callId, error, 'speech_processing');
    
    // Fallback TwiML
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('I apologize, I didn\'t catch that. Could you please repeat?');
    
    const gather = twiml.gather({
      input: 'speech',
      timeout: 10,
      action: `/api/voice/gather/${callId}`,
      method: 'POST'
    });
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

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
        
        const twiml = twilioVoice.generateVoicemailTwiML(callId, voicemailMessage);
        
        // Log voicemail
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
 * Handle incoming calls (optional)
 */
router.post('/incoming', (req, res) => {
  const { From, To } = req.body;
  
  const VoiceResponse = require('twilio').twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  twiml.say({
    voice: 'alice',
    language: 'en-US'
  }, 'Thank you for calling. This number is used for outbound sales calls only. Please visit our website for more information.');
  
  twiml.hangup();
  
  DebugLogger.logSuccess('Incoming call handled', {
    from: From,
    to: To
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
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

module.exports = router;
