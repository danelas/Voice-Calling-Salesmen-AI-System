const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { DebugLogger } = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * POST /api/simple-voice/stream/:callId
 * Simple TwiML that plays ElevenLabs audio without WebSocket complexity
 */
router.post('/stream/:callId', async (req, res) => {
  const { callId } = req.params;
  
  try {
    console.log(`📞 Simple voice stream requested for call: ${callId}`);
    
    // Get call and lead information
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { lead: true }
    });

    if (!call) {
      console.error(`❌ Call not found: ${callId}`);
      return res.status(404).send('Call not found');
    }

    console.log(`✅ Found call for ${call.lead.firstName} ${call.lead.lastName}`);

    // Generate simple TwiML that plays ElevenLabs audio
    const audioUrl = `${process.env.BASE_URL}/api/voice/audio/${callId}/greeting`;
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Play>${audioUrl}</Play>
    <Gather input="speech" timeout="10" action="${process.env.BASE_URL}/api/simple-voice/response/${callId}">
        <Say voice="alice">Please tell me, are you interested in selling your home?</Say>
    </Gather>
    <Say voice="alice">Thank you for your time. Have a great day!</Say>
    <Hangup/>
</Response>`;

    console.log(`✅ Generated simple TwiML for call: ${callId}`);
    
    res.type('text/xml').send(twiml);

  } catch (error) {
    console.error(`❌ Error in simple voice stream for ${callId}:`, error);
    DebugLogger.logCallError(callId, error, 'simple_voice_stream');
    
    // Fallback TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hello, this is a call from Levco Real Estate Group. We will call you back shortly.</Say>
    <Hangup/>
</Response>`;
    
    res.type('text/xml').send(fallbackTwiml);
  }
});

/**
 * POST /api/simple-voice/response/:callId
 * Handle customer response with simple TwiML
 */
router.post('/response/:callId', async (req, res) => {
  const { callId } = req.params;
  const { SpeechResult } = req.body;
  
  try {
    console.log(`🎤 Customer response for ${callId}: "${SpeechResult}"`);
    
    // Log the interaction
    if (SpeechResult) {
      await prisma.interaction.create({
        data: {
          callId: callId,
          speaker: 'CUSTOMER',
          content: SpeechResult,
          interactionType: 'RESPONSE',
          sentiment: 'neutral',
          timestamp: new Date()
        }
      });
    }

    // Simple response based on keywords
    let response = "Thank you for your response. ";
    
    if (SpeechResult && SpeechResult.toLowerCase().includes('yes')) {
      response += "That's great! We will have one of our top agents contact you within 24 hours to schedule a property evaluation.";
    } else if (SpeechResult && SpeechResult.toLowerCase().includes('no')) {
      response += "No problem at all. We'll keep your information on file in case you change your mind in the future.";
    } else {
      response += "We understand. If you ever consider selling, please don't hesitate to reach out to Levco Real Estate Group.";
    }

    // Log AI response
    await prisma.interaction.create({
      data: {
        callId: callId,
        speaker: 'AI',
        content: response,
        interactionType: 'CLOSING',
        sentiment: 'neutral',
        timestamp: new Date()
      }
    });

    // Generate closing TwiML
    const closingTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${response}</Say>
    <Say voice="alice">Have a wonderful day!</Say>
    <Hangup/>
</Response>`;

    console.log(`✅ Generated closing response for call: ${callId}`);
    
    res.type('text/xml').send(closingTwiml);

  } catch (error) {
    console.error(`❌ Error in simple voice response for ${callId}:`, error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Thank you for your time. Have a great day!</Say>
    <Hangup/>
</Response>`;
    
    res.type('text/xml').send(errorTwiml);
  }
});

module.exports = router;
