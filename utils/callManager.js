const { PrismaClient } = require('@prisma/client');
const OpenAIService = require('../services/openAIService');
const ElevenLabsService = require('../services/elevenLabsService');
const TextMagicService = require('../services/textMagicService');

const prisma = new PrismaClient();
const openAI = new OpenAIService();
const elevenLabs = new ElevenLabsService();
const textMagic = new TextMagicService();

class CallManager {
  constructor() {
    this.activeCalls = new Map(); // Store active call sessions
  }

  /**
   * Initialize a new call session
   * @param {string} leadId - Lead ID
   * @param {Object} options - Call options
   * @returns {Promise<Object>} Call session
   */
  async initializeCall(leadId, options = {}) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          calls: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      // Create call record
      const call = await prisma.call.create({
        data: {
          leadId: leadId,
          status: 'SCHEDULED',
          scheduledAt: options.scheduledAt ? new Date(options.scheduledAt) : new Date(),
        }
      });

      // Generate personalized script based on lead history
      const callHistory = lead.calls.map(c => ({
        outcome: c.outcome,
        notes: c.notes,
        createdAt: c.createdAt
      }));

      const script = await openAI.generatePersonalizedScript(lead, options.callType || 'cold');

      // Create call session
      const callSession = {
        callId: call.id,
        leadId: leadId,
        lead: lead,
        script: script,
        conversationHistory: [],
        startTime: null,
        status: 'initialized',
        currentStep: 'opening',
        analytics: {
          interactionCount: 0,
          objectionCount: 0,
          questionCount: 0,
          positiveSignals: [],
          negativeSignals: []
        }
      };

      this.activeCalls.set(call.id, callSession);

      return {
        success: true,
        callId: call.id,
        session: callSession,
        message: 'Call initialized successfully'
      };

    } catch (error) {
      console.error('Call initialization error:', error);
      throw new Error(`Failed to initialize call: ${error.message}`);
    }
  }

  /**
   * Start an active call
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Call start result
   */
  async startCall(callId) {
    try {
      const session = this.activeCalls.get(callId);
      if (!session) {
        throw new Error('Call session not found');
      }

      // Update call status
      await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });

      // Update session
      session.startTime = new Date();
      session.status = 'active';

      // Generate opening audio
      const openingAudio = await elevenLabs.generateSalesAudio(
        session.script.opening,
        'professional',
        callId
      );

      // Record opening interaction
      await prisma.interaction.create({
        data: {
          callId: callId,
          type: 'GREETING',
          speaker: 'AI',
          content: session.script.opening,
          timestamp: new Date(),
          confidence: 0.9
        }
      });

      session.conversationHistory.push({
        role: 'assistant',
        content: session.script.opening
      });

      session.analytics.interactionCount++;

      return {
        success: true,
        callId: callId,
        opening: session.script.opening,
        audioFile: openingAudio.filename,
        nextStep: 'wait_for_response'
      };

    } catch (error) {
      console.error('Call start error:', error);
      throw new Error(`Failed to start call: ${error.message}`);
    }
  }

  /**
   * Process customer response during call
   * @param {string} callId - Call ID
   * @param {string} customerMessage - Customer's response
   * @returns {Promise<Object>} AI response and next steps
   */
  async processCustomerResponse(callId, customerMessage) {
    try {
      const session = this.activeCalls.get(callId);
      if (!session) {
        throw new Error('Call session not found');
      }

      // Analyze customer response
      const analysis = await openAI.analyzeCustomerResponse(
        customerMessage,
        session.conversationHistory
      );

      // Record customer interaction
      await prisma.interaction.create({
        data: {
          callId: callId,
          type: this.determineInteractionType(analysis.intent),
          speaker: 'CUSTOMER',
          content: customerMessage,
          timestamp: new Date(),
          sentiment: analysis.sentiment,
          confidence: analysis.confidence
        }
      });

      // Update session analytics
      session.analytics.interactionCount++;
      if (analysis.objections.length > 0) {
        session.analytics.objectionCount++;
      }
      if (analysis.buyingSignals.length > 0) {
        session.analytics.positiveSignals.push(...analysis.buyingSignals);
      }

      // Add to conversation history
      session.conversationHistory.push({
        role: 'user',
        content: customerMessage
      });

      // Generate AI response based on analysis
      let aiResponse;
      if (analysis.intent === 'objection') {
        aiResponse = await openAI.handleObjection(customerMessage, session.lead);
      } else {
        const responseData = await openAI.generateSalesResponse(
          session.conversationHistory,
          session.lead,
          `Customer analysis: ${JSON.stringify(analysis)}`
        );
        aiResponse = responseData.response;
      }

      // Record AI interaction
      await prisma.interaction.create({
        data: {
          callId: callId,
          type: this.determineInteractionType(analysis.nextAction),
          speaker: 'AI',
          content: aiResponse,
          timestamp: new Date(),
          confidence: 0.9
        }
      });

      // Generate audio response
      const emotion = this.determineEmotion(analysis.sentiment, analysis.intent);
      const audioResponse = await elevenLabs.generateSalesAudio(
        aiResponse,
        emotion,
        callId
      );

      // Update conversation history
      session.conversationHistory.push({
        role: 'assistant',
        content: aiResponse
      });

      // Update current step based on analysis
      session.currentStep = this.determineNextStep(analysis.nextAction);
      session.analytics.interactionCount++;

      if (aiResponse.includes('?')) {
        session.analytics.questionCount++;
      }

      return {
        success: true,
        aiResponse: aiResponse,
        audioFile: audioResponse.filename,
        customerAnalysis: analysis,
        nextStep: session.currentStep,
        sessionAnalytics: session.analytics
      };

    } catch (error) {
      console.error('Customer response processing error:', error);
      throw new Error(`Failed to process customer response: ${error.message}`);
    }
  }

  /**
   * End a call and perform final analysis
   * @param {string} callId - Call ID
   * @param {Object} endData - Call end data
   * @returns {Promise<Object>} Call end result
   */
  async endCall(callId, endData = {}) {
    try {
      const session = this.activeCalls.get(callId);
      if (!session) {
        throw new Error('Call session not found');
      }

      const endTime = new Date();
      const duration = session.startTime ? 
        Math.floor((endTime - session.startTime) / 1000) : 0;

      // Update call record
      const updatedCall = await prisma.call.update({
        where: { id: callId },
        data: {
          status: 'COMPLETED',
          endedAt: endTime,
          duration: duration,
          outcome: endData.outcome || 'NO_ANSWER',
          notes: endData.notes || '',
          followUpDate: endData.followUpDate ? new Date(endData.followUpDate) : null
        }
      });

      // Get full transcript for analysis
      const interactions = await prisma.interaction.findMany({
        where: { callId: callId },
        orderBy: { timestamp: 'asc' }
      });

      const fullTranscript = interactions.map(interaction => ({
        speaker: interaction.speaker,
        content: interaction.content,
        timestamp: interaction.timestamp
      }));

      // Perform full call analysis
      const callAnalysis = await openAI.analyzeFullCall(fullTranscript, {
        duration: duration,
        outcome: endData.outcome || 'NO_ANSWER'
      });

      // Create detailed analytics
      await prisma.callAnalytics.create({
        data: {
          callId: callId,
          talkTime: Math.floor(duration * 0.6), // Estimate
          listenTime: Math.floor(duration * 0.4), // Estimate
          interruptionCount: session.analytics.interactionCount > 10 ? 
            Math.floor(session.analytics.interactionCount * 0.1) : 0,
          questionCount: session.analytics.questionCount,
          objectionCount: session.analytics.objectionCount,
          positiveKeywords: session.analytics.positiveSignals,
          negativeKeywords: [],
          emotionalTone: callAnalysis.customerSentiment,
          engagementScore: callAnalysis.conversionProbability,
          conversionProbability: callAnalysis.conversionProbability,
          improvementSuggestions: callAnalysis.improvementSuggestions
        }
      });

      // Update lead status based on outcome
      if (endData.outcome) {
        const newStatus = this.determineLeadStatus(endData.outcome);
        if (newStatus) {
          await prisma.lead.update({
            where: { id: session.leadId },
            data: { status: newStatus }
          });
        }
      }

      // Send follow-up SMS if appropriate
      if (['INTERESTED', 'MEETING_SCHEDULED', 'CALLBACK_REQUESTED'].includes(endData.outcome)) {
        try {
          await textMagic.sendFollowUpSMS(
            session.lead.phone,
            endData.outcome,
            endData.notes || 'Thank you for your time today!'
          );
        } catch (smsError) {
          console.error('Follow-up SMS failed:', smsError);
        }
      }

      // Remove from active calls
      this.activeCalls.delete(callId);

      return {
        success: true,
        call: updatedCall,
        analysis: callAnalysis,
        transcript: fullTranscript,
        message: 'Call ended and analyzed successfully'
      };

    } catch (error) {
      console.error('Call end error:', error);
      throw new Error(`Failed to end call: ${error.message}`);
    }
  }

  /**
   * Get active call session
   * @param {string} callId - Call ID
   * @returns {Object|null} Call session
   */
  getCallSession(callId) {
    return this.activeCalls.get(callId) || null;
  }

  /**
   * Get all active calls
   * @returns {Array} Active call sessions
   */
  getActiveCalls() {
    return Array.from(this.activeCalls.values());
  }

  /**
   * Helper methods
   */
  determineInteractionType(intent) {
    const typeMap = {
      'interested': 'PITCH',
      'objection': 'OBJECTION_HANDLING',
      'question': 'QUESTION',
      'ready_to_buy': 'CLOSING',
      'not_interested': 'CLOSING',
      'need_more_info': 'PITCH'
    };
    return typeMap[intent] || 'OTHER';
  }

  determineEmotion(sentiment, intent) {
    if (sentiment === 'negative' || intent === 'objection') {
      return 'empathetic';
    }
    if (sentiment === 'positive' || intent === 'interested') {
      return 'enthusiastic';
    }
    return 'professional';
  }

  determineNextStep(nextAction) {
    const stepMap = {
      'continue_pitch': 'pitching',
      'handle_objection': 'objection_handling',
      'schedule_follow_up': 'closing',
      'close_sale': 'closing',
      'end_call': 'ending'
    };
    return stepMap[nextAction] || 'continuing';
  }

  determineLeadStatus(outcome) {
    const statusMap = {
      'INTERESTED': 'QUALIFIED',
      'MEETING_SCHEDULED': 'QUALIFIED',
      'SALE_MADE': 'CLOSED_WON',
      'NOT_INTERESTED': 'CLOSED_LOST'
    };
    return statusMap[outcome] || null;
  }
}

module.exports = CallManager;
