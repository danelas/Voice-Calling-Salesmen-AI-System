const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.salesPersona = `You are an expert AI sales representative. You are professional, persuasive, and empathetic. 
    Your goal is to understand the customer's needs and present solutions that genuinely help them.
    
    Key traits:
    - Listen actively and ask clarifying questions
    - Handle objections with empathy and facts
    - Build rapport naturally
    - Focus on value, not just features
    - Know when to close and when to nurture
    - Always maintain a professional, friendly tone
    
    Remember: You're having a phone conversation, so keep responses conversational and natural.`;
  }

  /**
   * Generate sales conversation response
   * @param {Array} conversationHistory - Previous conversation messages
   * @param {Object} leadInfo - Information about the lead
   * @param {string} context - Current conversation context
   * @returns {Promise<Object>} AI response with analysis
   */
  async generateSalesResponse(conversationHistory, leadInfo, context = '') {
    try {
      const systemPrompt = `${this.salesPersona}
      
      Lead Information:
      - Name: ${leadInfo.firstName} ${leadInfo.lastName}
      - Company: ${leadInfo.company || 'Not specified'}
      - Industry: ${leadInfo.industry || 'Not specified'}
      - Previous interactions: ${leadInfo.previousCalls || 0} calls
      
      Context: ${context}
      
      Respond naturally as if you're speaking on the phone. Keep responses under 100 words for natural conversation flow.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ];

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const response = completion.choices[0].message.content;

      // Analyze the response for insights
      const analysis = await this.analyzeResponse(response, conversationHistory);

      return {
        response: response,
        analysis: analysis,
        usage: completion.usage
      };
    } catch (error) {
      console.error('OpenAI Sales Response Error:', error);
      throw new Error(`Failed to generate sales response: ${error.message}`);
    }
  }

  /**
   * Analyze customer response for sentiment and intent
   * @param {string} customerMessage - Customer's message
   * @param {Array} conversationHistory - Previous conversation
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeCustomerResponse(customerMessage, conversationHistory = []) {
    try {
      const analysisPrompt = `Analyze this customer response in a sales conversation context:
      
      Customer message: "${customerMessage}"
      
      Provide analysis in JSON format:
      {
        "sentiment": "positive|neutral|negative",
        "intent": "interested|objection|question|ready_to_buy|not_interested|need_more_info",
        "confidence": 0.0-1.0,
        "keyPoints": ["point1", "point2"],
        "suggestedResponse": "brief suggestion for sales rep",
        "objections": ["objection1", "objection2"] or [],
        "buyingSignals": ["signal1", "signal2"] or [],
        "nextAction": "continue_pitch|handle_objection|schedule_follow_up|close_sale|end_call"
      }`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: analysisPrompt },
          { role: 'user', content: customerMessage }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const analysisText = completion.choices[0].message.content;
      
      try {
        return JSON.parse(analysisText);
      } catch (parseError) {
        console.error('Failed to parse analysis JSON:', parseError);
        return {
          sentiment: 'neutral',
          intent: 'need_more_info',
          confidence: 0.5,
          keyPoints: [],
          suggestedResponse: 'Continue conversation naturally',
          objections: [],
          buyingSignals: [],
          nextAction: 'continue_pitch'
        };
      }
    } catch (error) {
      console.error('Customer Analysis Error:', error);
      throw new Error(`Failed to analyze customer response: ${error.message}`);
    }
  }

  /**
   * Generate objection handling response
   * @param {string} objection - Customer objection
   * @param {Object} leadInfo - Lead information
   * @returns {Promise<string>} Objection handling response
   */
  async handleObjection(objection, leadInfo) {
    try {
      const objectionPrompt = `You're a sales expert handling this objection: "${objection}"
      
      Lead info: ${leadInfo.firstName} from ${leadInfo.company || 'their company'}
      
      Provide a professional, empathetic response that:
      1. Acknowledges their concern
      2. Provides a thoughtful counter-argument or solution
      3. Asks a follow-up question to keep the conversation going
      
      Keep it conversational and under 80 words.`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: this.salesPersona },
          { role: 'user', content: objectionPrompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Objection Handling Error:', error);
      throw new Error(`Failed to handle objection: ${error.message}`);
    }
  }

  /**
   * Analyze entire call for insights and improvements
   * @param {Array} fullTranscript - Complete call transcript
   * @param {Object} callData - Call metadata
   * @returns {Promise<Object>} Call analysis and suggestions
   */
  async analyzeFullCall(fullTranscript, callData) {
    try {
      const analysisPrompt = `Analyze this complete sales call transcript and provide insights:
      
      Call Duration: ${callData.duration} seconds
      Outcome: ${callData.outcome}
      
      Transcript:
      ${fullTranscript.map(msg => `${msg.speaker}: ${msg.content}`).join('\n')}
      
      Provide analysis in JSON format:
      {
        "overallPerformance": "excellent|good|average|poor",
        "conversionProbability": 0.0-1.0,
        "keyStrengths": ["strength1", "strength2"],
        "areasForImprovement": ["improvement1", "improvement2"],
        "customerSentiment": "positive|neutral|negative",
        "talkTimeRatio": "ai_percentage",
        "objectionHandling": "excellent|good|average|poor",
        "closingAttempts": number,
        "nextSteps": "recommended next action",
        "improvementSuggestions": ["suggestion1", "suggestion2"]
      }`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert sales coach analyzing call performance.' },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      const analysisText = completion.choices[0].message.content;
      
      try {
        return JSON.parse(analysisText);
      } catch (parseError) {
        console.error('Failed to parse call analysis JSON:', parseError);
        return {
          overallPerformance: 'average',
          conversionProbability: 0.5,
          keyStrengths: [],
          areasForImprovement: ['Unable to analyze - parsing error'],
          customerSentiment: 'neutral',
          talkTimeRatio: '50%',
          objectionHandling: 'average',
          closingAttempts: 0,
          nextSteps: 'Follow up as planned',
          improvementSuggestions: []
        };
      }
    } catch (error) {
      console.error('Full Call Analysis Error:', error);
      throw new Error(`Failed to analyze full call: ${error.message}`);
    }
  }

  /**
   * Analyze AI response for quality and effectiveness
   * @param {string} response - AI generated response
   * @param {Array} conversationHistory - Previous conversation
   * @returns {Promise<Object>} Response analysis
   */
  async analyzeResponse(response, conversationHistory) {
    try {
      // Simple analysis for now - can be expanded
      const wordCount = response.split(' ').length;
      const hasQuestion = response.includes('?');
      const tone = response.toLowerCase().includes('sorry') || response.toLowerCase().includes('understand') ? 'empathetic' : 'professional';
      
      return {
        wordCount: wordCount,
        hasQuestion: hasQuestion,
        tone: tone,
        appropriateLength: wordCount <= 100,
        conversational: true
      };
    } catch (error) {
      console.error('Response Analysis Error:', error);
      return {
        wordCount: 0,
        hasQuestion: false,
        tone: 'professional',
        appropriateLength: true,
        conversational: true
      };
    }
  }

  /**
   * Generate personalized sales script based on lead information
   * @param {Object} leadInfo - Lead information
   * @param {string} callType - Type of call (cold, follow_up, demo, etc.)
   * @returns {Promise<Object>} Personalized script
   */
  async generatePersonalizedScript(leadInfo, callType = 'cold') {
    try {
      const scriptPrompt = `Generate a personalized sales script for a ${callType} call:
      
      Lead Information:
      - Name: ${leadInfo.firstName} ${leadInfo.lastName}
      - Company: ${leadInfo.company || 'Not specified'}
      - Industry: ${leadInfo.industry || 'Not specified'}
      - Source: ${leadInfo.source || 'Not specified'}
      
      Create a natural, conversational script with:
      1. Personalized opening
      2. Value proposition relevant to their industry
      3. 2-3 discovery questions
      4. Soft close or next step
      
      Format as JSON:
      {
        "opening": "personalized opening line",
        "valueProposition": "relevant value prop",
        "discoveryQuestions": ["question1", "question2", "question3"],
        "close": "soft close or next step"
      }`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: this.salesPersona },
          { role: 'user', content: scriptPrompt }
        ],
        max_tokens: 400,
        temperature: 0.7
      });

      const scriptText = completion.choices[0].message.content;
      
      try {
        return JSON.parse(scriptText);
      } catch (parseError) {
        console.error('Failed to parse script JSON:', parseError);
        return {
          opening: `Hi ${leadInfo.firstName}, this is [Your Name] calling about...`,
          valueProposition: 'We help companies like yours improve efficiency and reduce costs.',
          discoveryQuestions: [
            'What are your biggest challenges right now?',
            'How are you currently handling this?',
            'What would an ideal solution look like for you?'
          ],
          close: 'Would you be interested in learning more about how we can help?'
        };
      }
    } catch (error) {
      console.error('Script Generation Error:', error);
      throw new Error(`Failed to generate personalized script: ${error.message}`);
    }
  }
}

module.exports = OpenAIService;
