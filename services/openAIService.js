const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.salesPersona = `You are an expert AI sales representative calling on behalf of Levco Real Estate Group, a local brokerage in Hollywood. You are professional, persuasive, and empathetic.

    YOUR INTRODUCTION AND PURPOSE:
    "We are realtors from Levco Real Estate Group, a local brokerage here in Hollywood. We are reaching out to homeowners because we have buyers looking in the area and want to know if they are interested in selling. We then will set up appointments with them with the listing agent so we can get the property sold."

    CONVERSATION APPROACH:
    - Start with the Levco Real Estate Group introduction naturally
    - Explain you have buyers actively looking in their specific area
    - Focus on the opportunity to sell their property quickly
    - Offer to set up appointments with listing agents
    - Listen actively and ask clarifying questions
    - Handle objections with empathy and facts about the current market
    - Build rapport naturally by referencing their specific property details
    - Focus on the value of having qualified buyers ready
    - Know when to close for the appointment and when to nurture
    - Always maintain a professional, friendly tone

    CLOSING APPROACH FOR APPOINTMENTS:
    Use this natural closing technique: "We will be in your neighborhood this week with another homeowner, we can schedule to have one of our top agents meet you at your property as well."
    
    Then offer specific time options:
    - "Does morning or evening work best for you?"
    - "How about Monday at 5pm?"
    - "Would Tuesday morning around 10am work better?"
    - "What day this week would be most convenient?"
    
    This creates urgency (we're already in the neighborhood) and makes it easy for them to say yes to a specific time.
    
    Remember: You're having a phone conversation, so keep responses conversational and natural. Always work the Levco Real Estate Group introduction into your opening or early in the conversation.`;
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
      // Build comprehensive lead profile for AI context
      const leadProfile = this.buildLeadProfile(leadInfo);
      
      const systemPrompt = `${this.salesPersona}
      
      ${leadProfile}
      
      Context: ${context}
      
      IMPORTANT: Use this detailed information to personalize your conversation. Reference their location, property details, and personal information naturally when relevant. If they speak a language other than English, acknowledge this and offer to continue in their preferred language if needed.
      
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
   * Analyze complete conversation for final outcome and next steps
   * @param {Array} fullConversation - Complete conversation history
   * @param {Object} leadInfo - Lead information
   * @returns {Promise<Object>} Call outcome analysis
   */
  async analyzeCallOutcome(fullConversation, leadInfo) {
    try {
      const leadProfile = this.buildLeadProfile(leadInfo);
      
      const outcomePrompt = `Analyze this complete sales conversation and determine the outcome:

      ${leadProfile}

      CONVERSATION:
      ${fullConversation.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

      Analyze and provide:
      1. Overall outcome (INTERESTED, NOT_INTERESTED, APPOINTMENT_SET, CALLBACK_REQUESTED, OBJECTION_UNRESOLVED, HUNG_UP)
      2. Interest level (1-10 scale)
      3. Specific next steps needed
      4. Key objections raised
      5. Best follow-up timing
      6. Appointment details if scheduled
      7. Priority level for follow-up (HIGH, MEDIUM, LOW)

      Format as JSON:
      {
        "outcome": "INTERESTED|NOT_INTERESTED|APPOINTMENT_SET|CALLBACK_REQUESTED|OBJECTION_UNRESOLVED|HUNG_UP",
        "interestLevel": 1-10,
        "appointmentScheduled": true/false,
        "appointmentDetails": {
          "date": "if scheduled",
          "time": "if scheduled",
          "notes": "any specific requirements"
        },
        "nextSteps": ["specific action 1", "specific action 2"],
        "keyObjections": ["objection 1", "objection 2"],
        "followUpTiming": "IMMEDIATE|24_HOURS|1_WEEK|1_MONTH|NO_FOLLOWUP",
        "priority": "HIGH|MEDIUM|LOW",
        "summary": "brief summary of conversation outcome",
        "notificationRequired": true/false,
        "notificationMessage": "message for immediate notification if interested"
      }`;

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert sales conversation analyzer. Provide accurate, actionable analysis.' },
          { role: 'user', content: outcomePrompt }
        ],
        max_tokens: 600,
        temperature: 0.3
      });

      const analysisText = completion.choices[0].message.content;
      
      try {
        const analysis = JSON.parse(analysisText);
        
        // Add timestamp and lead info
        analysis.analyzedAt = new Date().toISOString();
        analysis.leadId = leadInfo.id;
        analysis.leadName = `${leadInfo.firstName} ${leadInfo.lastName}`;
        analysis.leadPhone = leadInfo.phone;
        
        return analysis;
      } catch (parseError) {
        console.error('Failed to parse outcome analysis:', parseError);
        return {
          outcome: 'ANALYSIS_FAILED',
          interestLevel: 5,
          summary: analysisText,
          notificationRequired: false
        };
      }
    } catch (error) {
      console.error('Call outcome analysis error:', error);
      throw new Error(`Failed to analyze call outcome: ${error.message}`);
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
      const leadProfile = this.buildLeadProfile(leadInfo);
      
      const objectionPrompt = `You're a sales expert handling this objection: "${objection}"
      
      ${leadProfile}
      
      Provide a professional, empathetic response that:
      1. Acknowledges their concern
      2. Uses their specific situation (property details, financial info) to provide a relevant counter-argument
      3. Asks a follow-up question that references their personal details
      
      If they speak a language other than English, acknowledge this appropriately.
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
      const leadProfile = this.buildLeadProfile(leadInfo);
      
      const scriptPrompt = `Generate a personalized sales script for a ${callType} call:
      
      ${leadProfile}
      
      REQUIRED: Include the Levco Real Estate Group introduction naturally in the opening:
      "We are realtors from Levco Real Estate Group, a local brokerage here in Hollywood. We are reaching out to homeowners because we have buyers looking in the area and want to know if they are interested in selling."
      
      Create a natural, conversational script that incorporates their specific details:
      1. Personalized opening that includes the Levco Real Estate Group introduction and references their location or property details
      2. Value proposition about having qualified buyers looking in their specific area
      3. 2-3 discovery questions about their selling timeline and property situation
      4. Closing approach using: "We will be in your neighborhood this week with another homeowner, we can schedule to have one of our top agents meet you at your property as well. Does morning or evening work best? How about Monday at 5pm?"
      
      If they speak a language other than English, note this in the opening.
      
      Format as JSON:
      {
        "opening": "personalized opening with Levco Real Estate Group introduction",
        "valueProposition": "value prop about having buyers looking in their area",
        "discoveryQuestions": ["question1", "question2", "question3"],
        "close": "neighborhood urgency close with specific time options",
        "languageNotes": "any language considerations"
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

  /**
   * Build comprehensive lead profile for AI context
   * @param {Object} leadInfo - Lead information from database
   * @returns {string} Formatted lead profile
   */
  buildLeadProfile(leadInfo) {
    const profile = [];
    
    // Personal Information
    profile.push(`COMPREHENSIVE LEAD PROFILE:`);
    const fullName = [leadInfo.firstName, leadInfo.middleInitial, leadInfo.lastName].filter(Boolean).join(' ');
    profile.push(`Name: ${fullName}`);
    if (leadInfo.exactAge) profile.push(`Age: ${leadInfo.exactAge} years old`);
    if (leadInfo.language && leadInfo.language !== 'en') {
      profile.push(`Preferred Language: ${this.getLanguageName(leadInfo.language)} (${leadInfo.language})`);
    }
    
    // Contact Information
    profile.push(`Phone: ${leadInfo.phone}${leadInfo.phoneType ? ` (${leadInfo.phoneType})` : ''}`);
    if (leadInfo.email) profile.push(`Email: ${leadInfo.email}`);
    
    // Address Information
    if (leadInfo.address || leadInfo.city || leadInfo.state) {
      const addressParts = [];
      if (leadInfo.address) addressParts.push(leadInfo.address);
      if (leadInfo.city) addressParts.push(leadInfo.city);
      if (leadInfo.state) addressParts.push(leadInfo.state);
      if (leadInfo.zipCode) {
        const zip = leadInfo.zipCodePlus4 ? `${leadInfo.zipCode}-${leadInfo.zipCodePlus4}` : leadInfo.zipCode;
        addressParts.push(zip);
      }
      profile.push(`Address: ${addressParts.join(', ')}`);
    }
    
    // Property Information
    if (leadInfo.homeValue) {
      profile.push(`Home Value (Assessed): $${leadInfo.homeValue.toLocaleString()}`);
    }
    if (leadInfo.yearBuilt) {
      const homeAge = new Date().getFullYear() - leadInfo.yearBuilt;
      profile.push(`Home Built: ${leadInfo.yearBuilt} (${homeAge} years old)`);
    }
    if (leadInfo.propertyType) profile.push(`Property Type: ${leadInfo.propertyType}`);
    if (leadInfo.yearsInResidence) {
      profile.push(`Years in Current Residence: ${leadInfo.yearsInResidence} years`);
    }
    if (leadInfo.purchasePrice && leadInfo.homePurchaseDate) {
      const purchaseYear = new Date(leadInfo.homePurchaseDate).getFullYear();
      profile.push(`Purchase Info: Bought for $${leadInfo.purchasePrice.toLocaleString()} in ${purchaseYear}`);
    }
    
    // Financial Information
    if (leadInfo.mostRecentMortgageAmount && leadInfo.mostRecentMortgageDate) {
      const mortgageYear = new Date(leadInfo.mostRecentMortgageDate).getFullYear();
      profile.push(`Recent Mortgage: $${leadInfo.mostRecentMortgageAmount.toLocaleString()} (${mortgageYear})`);
    }
    if (leadInfo.loanToValue) {
      profile.push(`Loan-to-Value Ratio: ${(leadInfo.loanToValue * 100).toFixed(1)}%`);
    }
    if (leadInfo.estimatedIncome) {
      profile.push(`Estimated Annual Income: $${leadInfo.estimatedIncome.toLocaleString()}`);
    }
    
    // Personal Demographics
    if (leadInfo.maritalStatus) profile.push(`Marital Status: ${leadInfo.maritalStatus}`);
    if (leadInfo.presenceOfChildren) {
      const childrenInfo = leadInfo.numberOfChildren ? 
        `Has ${leadInfo.numberOfChildren} children` : 'Has children';
      profile.push(`Family: ${childrenInfo}`);
    }
    if (leadInfo.education) profile.push(`Education: ${leadInfo.education}`);
    if (leadInfo.occupation) profile.push(`Occupation: ${leadInfo.occupation}`);
    
    // Business Information
    if (leadInfo.company) profile.push(`Company: ${leadInfo.company}`);
    if (leadInfo.industry) profile.push(`Industry: ${leadInfo.industry}`);
    
    // Compliance
    if (leadInfo.dncStatus) profile.push(`⚠️ DNC Status: Do Not Call - HANDLE WITH CARE`);
    
    // Lead Management Info
    profile.push(`Lead Status: ${leadInfo.status}`);
    if (leadInfo.source) profile.push(`Lead Source: ${leadInfo.source}`);
    if (leadInfo.notes) profile.push(`Notes: ${leadInfo.notes}`);
    
    return profile.join('\n');
  }

  /**
   * Get full language name from language code
   * @param {string} langCode - Language code (e.g., 'es', 'fr')
   * @returns {string} Full language name
   */
  getLanguageName(langCode) {
    const languages = {
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'ru': 'Russian'
    };
    return languages[langCode] || langCode.toUpperCase();
  }
}

module.exports = OpenAIService;
