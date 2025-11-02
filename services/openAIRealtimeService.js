const WebSocket = require('ws');
const { DebugLogger } = require('../utils/logger');

class OpenAIRealtimeService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.connections = new Map(); // Track active call connections
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required for realtime service');
    }
  }

  /**
   * Start a realtime conversation for a call
   * @param {string} callId - Unique call identifier
   * @param {Object} leadData - Lead information for personalization
   * @param {Object} twilioStream - Twilio media stream
   */
  async startRealtimeConversation(callId, leadData, twilioStream) {
    try {
      // Connect to OpenAI Realtime API
      const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      // Store connection
      this.connections.set(callId, {
        openaiWs,
        twilioStream,
        leadData,
        conversationHistory: []
      });

      // Configure OpenAI session
      openaiWs.on('open', () => {
        DebugLogger.logSuccess('OpenAI Realtime connected', { callId });
        
        // Configure the session with lead context
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: this.buildRealtimeInstructions(leadData),
            voice: 'alloy', // Will be replaced with ElevenLabs
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            tools: [],
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };
        
        openaiWs.send(JSON.stringify(sessionConfig));
      });

      // Handle OpenAI messages
      openaiWs.on('message', async (data) => {
        const message = JSON.parse(data.toString());
        await this.handleOpenAIMessage(callId, message);
      });

      // Handle Twilio audio stream
      twilioStream.on('media', (media) => {
        if (openaiWs.readyState === WebSocket.OPEN) {
          // Forward audio to OpenAI
          const audioAppend = {
            type: 'input_audio_buffer.append',
            audio: media.payload
          };
          openaiWs.send(JSON.stringify(audioAppend));
        }
      });

      // Start the conversation
      this.initiateGreeting(callId);

    } catch (error) {
      DebugLogger.logCallError(callId, error, 'realtime_setup');
      throw error;
    }
  }

  /**
   * Build personalized instructions for OpenAI
   */
  buildRealtimeInstructions(leadData) {
    return `You are a professional real estate agent from Levco Real Estate Group, a local brokerage in Hollywood, Florida. 

LEAD INFORMATION:
- Name: ${leadData.firstName} ${leadData.lastName}
- Phone: ${leadData.phone}
- Location: ${leadData.city}, ${leadData.state}
- Home Value: $${leadData.homeValue?.toLocaleString() || 'Unknown'}
- Age: ${leadData.exactAge || 'Unknown'}
- Property Type: ${leadData.propertyType || 'Unknown'}
- Years in Residence: ${leadData.yearsInResidence || 'Unknown'}
- Estimated Income: $${leadData.estimatedIncome?.toLocaleString() || 'Unknown'}
- Marital Status: ${leadData.maritalStatus || 'Unknown'}

CONVERSATION GOALS:
1. Introduce yourself professionally as calling from Levco Real Estate Group
2. Explain you have buyers looking in their area and want to know if they're interested in selling
3. Use their personal information naturally in conversation (home value, years in residence, etc.)
4. Handle objections professionally using the lead data
5. Try to schedule an appointment with a listing agent
6. Use urgency: "We'll be in your neighborhood this week with another homeowner"

CONVERSATION STYLE:
- Professional but friendly
- Use their name frequently
- Reference specific details about their property
- Be conversational, not scripted
- Listen actively and respond to their concerns
- Keep responses concise (30-60 seconds max)

CLOSING APPROACH:
If they show interest, use: "We will be in your neighborhood this week with another homeowner, we can schedule to have one of our top agents meet you at your property as well. Does morning or evening work best? How about Monday 5pm?"

Remember: You're having a real conversation, not reading a script. Use the lead information to make it personal and relevant.`;
  }

  /**
   * Handle messages from OpenAI Realtime API
   */
  async handleOpenAIMessage(callId, message) {
    const connection = this.connections.get(callId);
    if (!connection) return;

    try {
      switch (message.type) {
        case 'response.audio.delta':
          // OpenAI is generating audio - we'll replace this with ElevenLabs
          await this.handleAudioResponse(callId, message.delta);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // Customer speech transcribed
          const customerText = message.transcript;
          DebugLogger.logSuccess('Customer speech transcribed', {
            callId,
            transcript: customerText
          });
          
          // Log to database
          await this.logInteraction(callId, 'CUSTOMER', customerText);
          break;

        case 'response.text.delta':
          // AI text response (we'll convert to ElevenLabs audio)
          await this.handleTextResponse(callId, message.delta);
          break;

        case 'response.done':
          // Response complete
          DebugLogger.logSuccess('AI response complete', { callId });
          break;

        case 'error':
          DebugLogger.logCallError(callId, new Error(message.error.message), 'openai_realtime');
          break;
      }
    } catch (error) {
      DebugLogger.logCallError(callId, error, 'message_handling');
    }
  }

  /**
   * Handle AI audio response (replace with ElevenLabs)
   */
  async handleAudioResponse(callId, audioDelta) {
    // Instead of using OpenAI's voice, we'll use ElevenLabs
    // This is where we'd convert the text to ElevenLabs audio
    const connection = this.connections.get(callId);
    if (!connection) return;

    // For now, we'll use the audio delta, but ideally convert text to ElevenLabs
    if (connection.twilioStream) {
      connection.twilioStream.send(JSON.stringify({
        event: 'media',
        streamSid: connection.twilioStream.streamSid,
        media: {
          payload: audioDelta
        }
      }));
    }
  }

  /**
   * Handle AI text response and convert to ElevenLabs audio
   */
  async handleTextResponse(callId, textDelta) {
    const connection = this.connections.get(callId);
    if (!connection) return;

    // Accumulate text response
    if (!connection.currentResponse) {
      connection.currentResponse = '';
    }
    connection.currentResponse += textDelta;

    // When we have a complete sentence, convert to ElevenLabs audio
    if (textDelta.includes('.') || textDelta.includes('!') || textDelta.includes('?')) {
      await this.convertToElevenLabsAudio(callId, connection.currentResponse);
      connection.currentResponse = '';
    }
  }

  /**
   * Convert text to ElevenLabs audio and stream to call
   */
  async convertToElevenLabsAudio(callId, text) {
    try {
      const connection = this.connections.get(callId);
      if (!connection) return;

      // Generate ElevenLabs audio
      const ElevenLabsService = require('./elevenLabsService');
      const elevenLabs = new ElevenLabsService();
      
      const audioBuffer = await elevenLabs.generateSalesAudio(text, connection.leadData);
      
      // Convert to base64 for Twilio
      const audioBase64 = audioBuffer.toString('base64');
      
      // Send to Twilio stream
      if (connection.twilioStream) {
        connection.twilioStream.send(JSON.stringify({
          event: 'media',
          streamSid: connection.twilioStream.streamSid,
          media: {
            payload: audioBase64
          }
        }));
      }

      // Log the interaction
      await this.logInteraction(callId, 'AI', text);

    } catch (error) {
      DebugLogger.logCallError(callId, error, 'elevenlabs_conversion');
    }
  }

  /**
   * Start the conversation with a greeting
   */
  async initiateGreeting(callId) {
    const connection = this.connections.get(callId);
    if (!connection) return;

    const greeting = `Hello, is this ${connection.leadData.firstName} ${connection.leadData.lastName}?`;
    
    // Send greeting to OpenAI to start the conversation
    const greetingMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'text',
          text: greeting
        }]
      }
    };

    connection.openaiWs.send(JSON.stringify(greetingMessage));
    
    // Trigger response generation
    const responseCreate = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    };
    
    connection.openaiWs.send(JSON.stringify(responseCreate));
  }

  /**
   * Log interaction to database
   */
  async logInteraction(callId, speaker, content) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.interaction.create({
        data: {
          callId,
          speaker,
          content,
          interactionType: speaker === 'AI' ? 'RESPONSE' : 'INPUT',
          sentiment: 'neutral',
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log interaction:', error);
    }
  }

  /**
   * End a realtime conversation
   */
  endConversation(callId) {
    const connection = this.connections.get(callId);
    if (connection) {
      if (connection.openaiWs) {
        connection.openaiWs.close();
      }
      this.connections.delete(callId);
      
      DebugLogger.logSuccess('Realtime conversation ended', { callId });
    }
  }
}

module.exports = OpenAIRealtimeService;
