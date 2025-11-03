const WebSocket = require('ws');
const { DebugLogger } = require('../utils/logger');
const { muLawBase64ToPCM16, mp3ToMulawChunks, sleep } = require('../utils/audioUtils');

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
        conversationHistory: [],
        streamSid: null,
        pcmBuffer: Buffer.alloc(0),
        commitTimer: null,
        lastAudioAt: 0,
        mediaEncoding: 'audio/x-mulaw;rate=8000',
        sampleRateHz: 8000,
        hasCommittedAudio: false,
      });

      // Configure OpenAI session
      openaiWs.on('open', () => {
        console.log(`🤖 OpenAI Realtime connected for call ${callId}`);
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
        try {
          const message = JSON.parse(data.toString());
          console.log(`📨 OpenAI message for ${callId}:`, message.type);
          await this.handleOpenAIMessage(callId, message);
        } catch (error) {
          console.error(`❌ Error handling OpenAI message for ${callId}:`, error);
        }
      });

      // Handle OpenAI errors
      openaiWs.on('error', (error) => {
        console.error(`❌ OpenAI WebSocket error for ${callId}:`, error);
        DebugLogger.logCallError(callId, error, 'openai_websocket');
      });

      // Handle OpenAI close
      openaiWs.on('close', (code, reason) => {
        console.log(`🔌 OpenAI WebSocket closed for ${callId}:`, code, reason.toString());
      });

      // Twilio media is handled via realtimeVoice -> handleTwilioMedia

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
          // Ignore OpenAI audio (we use ElevenLabs voice)
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

          // Ask the model to respond (text only; we'll synthesize with ElevenLabs)
          try {
            const responseCreate = {
              type: 'response.create',
              response: {
                modalities: ['text']
              }
            };
            connection.openaiWs.send(JSON.stringify(responseCreate));
          } catch (e) {
            DebugLogger.logCallError(callId, e, 'response_create');
          }
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
    // No-op: we don't forward OpenAI audio
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
      
      const mp3Buffer = await elevenLabs.generateSalesAudio(text, 'professional', callId);

      // Convert ElevenLabs audio (mp3) to 8k mulaw frames
      const frames = await mp3ToMulawChunks(mp3Buffer, 20);

      // Stream frames to Twilio as base64 payloads
      for (const frame of frames) {
        if (!connection.twilioStream) break;
        const payload = frame.toString('base64');
        const msg = {
          event: 'media',
          media: { payload }
        };
        if (connection.streamSid) {
          msg.streamSid = connection.streamSid;
        }
        connection.twilioStream.send(JSON.stringify(msg));
        await sleep(20);
      }

      // Log the interaction
      await this.logInteraction(callId, 'AI', text);

    } catch (error) {
      DebugLogger.logCallError(callId, error, 'elevenlabs_conversion');
    }
  }

  /**
   * Set Twilio stream SID for routing outbound media
   */
  setStreamSid(callId, streamSid) {
    const connection = this.connections.get(callId);
    if (connection) {
      connection.streamSid = streamSid;
    }
  }

  /**
   * Handle a single Twilio media payload (base64 mu-law) and feed to OpenAI
   */
  async handleTwilioMedia(callId, muLawBase64) {
    const connection = this.connections.get(callId);
    if (!connection || !connection.openaiWs || connection.openaiWs.readyState !== WebSocket.OPEN) return;

    try {
      let pcm16;
      const enc = (connection.mediaEncoding || '').toLowerCase();
      if (enc.includes('mulaw')) {
        pcm16 = muLawBase64ToPCM16(muLawBase64);
      } else if (enc.includes('l16') || enc.includes('pcm')) {
        // Payload already PCM16 LE
        pcm16 = Buffer.from(muLawBase64, 'base64');
      } else {
        // Default to mu-law
        pcm16 = muLawBase64ToPCM16(muLawBase64);
      }
      connection.pcmBuffer = Buffer.concat([connection.pcmBuffer, pcm16]);
      connection.lastAudioAt = Date.now();

      // Debounced commit to OpenAI (aggregate ~200ms)
      if (!connection.commitTimer) {
        connection.commitTimer = setTimeout(() => {
          this.flushAudioToOpenAI(callId).catch(err => {
            DebugLogger.logCallError(callId, err, 'audio_flush');
          });
        }, 220);
      }
    } catch (e) {
      DebugLogger.logCallError(callId, e, 'twilio_media_handle');
    }
  }

  /**
   * Flush buffered PCM16 to OpenAI input_audio_buffer
   */
  async flushAudioToOpenAI(callId) {
    const connection = this.connections.get(callId);
    if (!connection || !connection.openaiWs || connection.openaiWs.readyState !== WebSocket.OPEN) return;

    const pcm = connection.pcmBuffer;
    connection.pcmBuffer = Buffer.alloc(0);
    clearTimeout(connection.commitTimer);
    connection.commitTimer = null;

    if (!pcm || pcm.length === 0) return;

    // Ensure at least 100ms of audio buffered before commit
    const sampleRate = this.connections.get(callId)?.sampleRateHz || 8000;
    const minSamples = Math.ceil(sampleRate * 0.1); // 100ms
    const minBytes = minSamples * 2; // PCM16 = 2 bytes/sample
    if (pcm.length < minBytes) {
      // Re-append to buffer and re-schedule
      connection.pcmBuffer = Buffer.concat([pcm, connection.pcmBuffer]);
      connection.commitTimer = setTimeout(() => {
        this.flushAudioToOpenAI(callId).catch(err => DebugLogger.logCallError(callId, err, 'audio_flush_reschedule'));
      }, 120);
      return;
    }

    const audioAppend = {
      type: 'input_audio_buffer.append',
      audio: pcm.toString('base64')
    };
    connection.openaiWs.send(JSON.stringify(audioAppend));

    const commit = { type: 'input_audio_buffer.commit' };
    connection.openaiWs.send(JSON.stringify(commit));
    connection.hasCommittedAudio = true;
  }

  /**
   * Start the conversation with a greeting
   */
  async initiateGreeting(callId) {
    const connection = this.connections.get(callId);
    if (!connection) return;

    const greeting = `Hello, is this ${connection.leadData.firstName} ${connection.leadData.lastName}?`;
    
    // Do not request OpenAI response yet; speak greeting via ElevenLabs immediately
    // After first user speech transcription completes, we'll create a response.

    // Also immediately speak the greeting with ElevenLabs so caller hears audio promptly
    try {
      await this.convertToElevenLabsAudio(callId, greeting);
    } catch (e) {
      DebugLogger.logCallError(callId, e, 'greeting_tts');
    }
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
