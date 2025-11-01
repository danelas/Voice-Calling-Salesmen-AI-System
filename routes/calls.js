const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OpenAIService = require('../services/openAIService');
const ElevenLabsService = require('../services/elevenLabsService');
const TextMagicService = require('../services/textMagicService');
const TwilioVoiceService = require('../services/twilioVoiceService');

const openAI = new OpenAIService();
const elevenLabs = new ElevenLabsService();
const textMagic = new TextMagicService();

/**
 * POST /api/calls/initiate
 * Initiate a new sales call
 */
router.post('/initiate', async (req, res) => {
  try {
    const { leadId, scheduledAt, callType = 'COLD_CALL' } = req.body;

    // Get lead information
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create call record
    const call = await prisma.call.create({
      data: {
        leadId: leadId,
        status: 'SCHEDULED',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      }
    });

    // Generate personalized script
    const script = await openAI.generatePersonalizedScript(lead, callType.toLowerCase());

    // Use Twilio to make actual call
    const twilioVoice = new TwilioVoiceService();
    
    // Ensure phone number has +1 prefix for US numbers
    let phoneNumber = lead.phone;
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+1' + phoneNumber;
    }
    
    try {
      const callResult = await twilioVoice.initiateCall(phoneNumber, call.id, lead);
      
      // Update call status
      await prisma.call.update({
        where: { id: call.id },
        data: { 
          status: 'IN_PROGRESS',
          twilioCallSid: callResult.twilioCallSid,
          startedAt: new Date()
        }
      });
    } catch (twilioError) {
      console.log('Twilio call failed, using simulation:', twilioError.message);
      // Fallback to simulation if Twilio fails
      const callResult = await textMagic.initiateCall(lead.phone, script.opening);
    }

    // Generate opening audio
    const openingAudio = await elevenLabs.generateSalesAudio(
      script.opening,
      'professional',
      call.id
    );

    res.json({
      success: true,
      call: call,
      script: script,
      audioFile: openingAudio.filename,
      message: 'Call initiated successfully'
    });

  } catch (error) {
    console.error('Call initiation error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate call',
      message: error.message 
    });
  }
});

/**
 * POST /api/calls/:callId/start
 * Start an active call
 */
router.post('/:callId/start', async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await prisma.call.update({
      where: { id: callId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date()
      },
      include: {
        lead: true
      }
    });

    // Initialize conversation history
    const conversationHistory = [
      {
        role: 'assistant',
        content: 'Call started - ready to begin conversation'
      }
    ];

    res.json({
      success: true,
      call: call,
      conversationHistory: conversationHistory,
      message: 'Call started successfully'
    });

  } catch (error) {
    console.error('Call start error:', error);
    res.status(500).json({ 
      error: 'Failed to start call',
      message: error.message 
    });
  }
});

/**
 * POST /api/calls/:callId/interact
 * Handle conversation interaction during call
 */
router.post('/:callId/interact', async (req, res) => {
  try {
    const { callId } = req.params;
    const { customerMessage, conversationHistory = [] } = req.body;

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { lead: true }
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Analyze customer response
    const customerAnalysis = await openAI.analyzeCustomerResponse(
      customerMessage,
      conversationHistory
    );

    // Record customer interaction
    await prisma.interaction.create({
      data: {
        callId: callId,
        type: 'OTHER',
        speaker: 'CUSTOMER',
        content: customerMessage,
        timestamp: new Date(),
        sentiment: customerAnalysis.sentiment,
        confidence: customerAnalysis.confidence
      }
    });

    // Generate AI response
    const aiResponse = await openAI.generateSalesResponse(
      [...conversationHistory, { role: 'user', content: customerMessage }],
      call.lead,
      `Customer analysis: ${JSON.stringify(customerAnalysis)}`
    );

    // Record AI interaction
    await prisma.interaction.create({
      data: {
        callId: callId,
        type: customerAnalysis.nextAction === 'handle_objection' ? 'OBJECTION_HANDLING' : 'OTHER',
        speaker: 'AI',
        content: aiResponse.response,
        timestamp: new Date(),
        confidence: 0.9
      }
    });

    // Skip audio generation for now - use Twilio's built-in TTS
    console.log('Skipping audio generation, using Twilio TTS');
    const audioPath = null;

    res.json({
      success: true,
      aiResponse: aiResponse.response,
      customerAnalysis: customerAnalysis,
      audioFile: audioResponse.filename,
      nextAction: customerAnalysis.nextAction,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: customerMessage },
        { role: 'assistant', content: aiResponse.response }
      ]
    });

  } catch (error) {
    console.error('Call interaction error:', error);
    res.status(500).json({ 
      error: 'Failed to process interaction',
      message: error.message 
    });
  }
});

/**
 * POST /api/calls/:callId/end
 * End a call and analyze results
 */
router.post('/:callId/end', async (req, res) => {
  try {
    const { callId } = req.params;
    const { outcome, notes, followUpDate } = req.body;

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        interactions: true,
        lead: true
      }
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const endTime = new Date();
    const duration = call.startedAt ? 
      Math.floor((endTime - call.startedAt) / 1000) : 0;

    // Update call record
    const updatedCall = await prisma.call.update({
      where: { id: callId },
      data: {
        status: 'COMPLETED',
        endedAt: endTime,
        duration: duration,
        outcome: outcome,
        notes: notes,
        followUpDate: followUpDate ? new Date(followUpDate) : null
      }
    });

    // Analyze full call
    const fullTranscript = call.interactions.map(interaction => ({
      speaker: interaction.speaker,
      content: interaction.content,
      timestamp: interaction.timestamp
    }));

    const callAnalysis = await openAI.analyzeFullCall(fullTranscript, {
      duration: duration,
      outcome: outcome
    });

    // Create call analytics
    await prisma.callAnalytics.create({
      data: {
        callId: callId,
        talkTime: Math.floor(duration * 0.6), // Estimate AI talk time
        listenTime: Math.floor(duration * 0.4), // Estimate customer talk time
        interruptionCount: 0, // Would need real-time analysis
        questionCount: call.interactions.filter(i => 
          i.speaker === 'AI' && i.content.includes('?')
        ).length,
        objectionCount: call.interactions.filter(i => 
          i.type === 'OBJECTION_HANDLING'
        ).length,
        positiveKeywords: [],
        negativeKeywords: [],
        emotionalTone: callAnalysis.customerSentiment,
        engagementScore: callAnalysis.conversionProbability,
        conversionProbability: callAnalysis.conversionProbability,
        improvementSuggestions: callAnalysis.improvementSuggestions
      }
    });

    // Update lead status based on outcome
    let newLeadStatus = call.lead.status;
    switch (outcome) {
      case 'INTERESTED':
        newLeadStatus = 'QUALIFIED';
        break;
      case 'MEETING_SCHEDULED':
        newLeadStatus = 'QUALIFIED';
        break;
      case 'SALE_MADE':
        newLeadStatus = 'CLOSED_WON';
        break;
      case 'NOT_INTERESTED':
        newLeadStatus = 'CLOSED_LOST';
        break;
    }

    await prisma.lead.update({
      where: { id: call.leadId },
      data: { status: newLeadStatus }
    });

    // Send follow-up SMS if outcome warrants it
    if (['INTERESTED', 'MEETING_SCHEDULED', 'CALLBACK_REQUESTED'].includes(outcome)) {
      try {
        await textMagic.sendFollowUpSMS(
          call.lead.phone,
          outcome,
          notes || 'Thank you for your time today!'
        );
      } catch (smsError) {
        console.error('Follow-up SMS failed:', smsError);
      }
    }

    res.json({
      success: true,
      call: updatedCall,
      analysis: callAnalysis,
      message: 'Call ended and analyzed successfully'
    });

  } catch (error) {
    console.error('Call end error:', error);
    res.status(500).json({ 
      error: 'Failed to end call',
      message: error.message 
    });
  }
});

/**
 * GET /api/calls
 * Get call history with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      outcome, 
      leadId,
      startDate,
      endDate 
    } = req.query;

    const skip = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (outcome) where.outcome = outcome;
    if (leadId) where.leadId = leadId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: {
          lead: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
              phone: true
            }
          },
          analytics: true
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.call.count({ where })
    ]);

    res.json({
      success: true,
      calls: calls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calls',
      message: error.message 
    });
  }
});

/**
 * GET /api/calls/:callId
 * Get detailed call information
 */
router.get('/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        lead: true,
        interactions: {
          orderBy: { timestamp: 'asc' }
        },
        analytics: true
      }
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json({
      success: true,
      call: call
    });

  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch call',
      message: error.message 
    });
  }
});

/**
 * POST /api/calls/test
 * Simple test call endpoint for quick testing
 */
router.post('/test', async (req, res) => {
  try {
    const { phone, firstName = 'Test', lastName = 'User' } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required for test call'
      });
    }

    // Create or find test lead
    const lead = await prisma.lead.upsert({
      where: { phone: phone },
      update: {
        firstName,
        lastName,
        notes: 'Test lead for call testing'
      },
      create: {
        firstName,
        lastName,
        phone: phone,
        notes: 'Test lead for call testing',
        source: 'test_call',
        status: 'NEW'
      }
    });

    // Create call record
    const call = await prisma.call.create({
      data: {
        leadId: lead.id,
        status: 'SCHEDULED',
        scheduledAt: new Date()
      }
    });

    // For testing, we'll simulate the call process
    const testResults = {
      leadCreated: true,
      callCreated: true,
      leadId: lead.id,
      callId: call.id,
      phone: phone,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/voice/twiml/${call.id}`,
      statusUrl: `${req.protocol}://${req.get('host')}/api/voice/status/${call.id}`
    };

    res.json({
      success: true,
      message: 'Test call setup completed',
      data: testResults,
      instructions: {
        step1: 'Lead and call records created',
        step2: 'Configure Twilio webhook to use the webhookUrl',
        step3: 'Make a test call to verify the system',
        step4: 'Check call status and conversation logs'
      }
    });

  } catch (error) {
    console.error('Test call setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup test call',
      message: error.message
    });
  }
});

module.exports = router;
