const WebSocket = require('ws');
const { DebugLogger } = require('../utils/logger');
const { muLawBase64ToPCM16, mp3ToMulawChunks, sleep } = require('../utils/audioUtils');

// Simple RMS calculator for PCM16LE buffers
function computeRmsPCM16LE(buf) {
  let sum = 0;
  const n = (buf.length / 2) | 0;
  for (let i = 0; i < n; i++) {
    const s = buf.readInt16LE(i * 2);
    sum += s * s;
  }
  return n ? Math.sqrt(sum / n) : 0;
}

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
  async startRealtimeConversation(callId, leadData, twilioStream, mediaInfo = null) {
    try {
      // Store connection (OpenAI WS will be connected lazily on first audio)
      this.connections.set(callId, {
        openaiWs: null,
        twilioStream,
        leadData,
        conversationHistory: [],
        streamSid: null,
        pcmBuffer: Buffer.alloc(0),
        ulawBuffer: Buffer.alloc(0),
        commitTimer: null,
        lastAudioAt: 0,
        mediaEncoding: (mediaInfo && mediaInfo.encoding) ? mediaInfo.encoding : 'audio/x-mulaw;rate=8000',
        sampleRateHz: (mediaInfo && mediaInfo.sampleRate) ? mediaInfo.sampleRate : 8000,
        inputFormatType: (mediaInfo && mediaInfo.encoding && String(mediaInfo.encoding).toLowerCase().includes('mulaw')) ? 'g711_ulaw' : 'pcm16',
        hasCommittedAudio: false,
        openaiConnected: false,
        openaiConnecting: false,
        flushing: false,
        sessionReady: false,
        primed: false,
        pendingAppendBytes: 0,
      });

      // Start the conversation with a spoken greeting (no OpenAI yet)
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
    if (!connection) return;

    try {
      const enc = (connection.mediaEncoding || '').toLowerCase();
      let chunk;
      if (enc.includes('mulaw')) {
        // Decode mu-law to PCM16
        chunk = muLawBase64ToPCM16(muLawBase64);
        // Also keep raw ulaw bytes for direct send to OpenAI when using g711_ulaw
        try {
          const raw = Buffer.from(muLawBase64, 'base64');
          connection.ulawBuffer = Buffer.concat([connection.ulawBuffer, raw]);
        } catch {}
      } else {
        // Already PCM16 little-endian
        chunk = Buffer.from(muLawBase64, 'base64');
      }
      connection.pcmBuffer = Buffer.concat([connection.pcmBuffer, chunk]);
      connection.lastAudioAt = Date.now();

      // Debounced commit to OpenAI (aggregate ~110ms)
      if (!connection.commitTimer) {
        connection.commitTimer = setTimeout(() => {
          this.flushAudioToOpenAI(callId).catch(err => {
            DebugLogger.logCallError(callId, err, 'audio_flush');
          });
        }, 110);
      }

      // Energy-based early commit: if voiced and we already have >=100ms buffered, flush sooner
      try {
        const sampleRate = connection.sampleRateHz || 8000;
        const minBytes100 = Math.ceil(sampleRate * 0.1) * 2;
        const rms = computeRmsPCM16LE(chunk);
        const RMS_THRESHOLD = 300; // lowered to detect softer speech
        if (rms > RMS_THRESHOLD && connection.pcmBuffer.length >= minBytes100) {
          if (connection.commitTimer) clearTimeout(connection.commitTimer);
          connection.commitTimer = setTimeout(() => {
            this.flushAudioToOpenAI(callId).catch(err => DebugLogger.logCallError(callId, err, 'audio_flush_early'));
          }, 20);
        }
      } catch {}
    } catch (e) {
      DebugLogger.logCallError(callId, e, 'twilio_media_handle');
    }
  }

  /**
   * Flush buffered PCM16 to OpenAI input_audio_buffer
   */
  async flushAudioToOpenAI(callId) {
    const connection = this.connections.get(callId);
    if (!connection) return;

    // Ensure OpenAI connection is ready; if not, kick off connect and retry later
    if (!connection.openaiWs || connection.openaiWs.readyState !== WebSocket.OPEN) {
      if (!connection.openaiConnecting) {
        this.ensureOpenAIConnected(callId).catch(err => DebugLogger.logCallError(callId, err, 'openai_connect'));
      }
      // keep buffer intact and retry shortly if we have audio
      if (connection.pcmBuffer && connection.pcmBuffer.length > 0) {
        clearTimeout(connection.commitTimer);
        connection.commitTimer = setTimeout(() => {
          this.flushAudioToOpenAI(callId).catch(err => DebugLogger.logCallError(callId, err, 'audio_flush_retry'));
        }, 150);
      }
      return;
    }

    // Ensure the OpenAI session has been updated before committing audio
    if (!connection.sessionReady) {
      if (connection.pcmBuffer && connection.pcmBuffer.length > 0) {
        clearTimeout(connection.commitTimer);
        connection.commitTimer = setTimeout(() => {
          this.flushAudioToOpenAI(callId).catch(err => DebugLogger.logCallError(callId, err, 'audio_flush_session_not_ready'));
        }, 120);
      }
      return;
    }

    if (connection.flushing) {
      // avoid overlapping flushes; try again shortly
      clearTimeout(connection.commitTimer);
      connection.commitTimer = setTimeout(() => {
        this.flushAudioToOpenAI(callId).catch(err => DebugLogger.logCallError(callId, err, 'audio_flush_overlap_retry'));
      }, 120);
      return;
    }
    connection.flushing = true;

    const useUlaw = (connection.inputFormatType === 'g711_ulaw');
    const buf = useUlaw ? connection.ulawBuffer : connection.pcmBuffer;
    const bytesPerSample = useUlaw ? 1 : 2;
    if (useUlaw) {
      connection.ulawBuffer = Buffer.alloc(0);
    } else {
      connection.pcmBuffer = Buffer.alloc(0);
    }
    clearTimeout(connection.commitTimer);
    connection.commitTimer = null;

    // Nothing new to append; release lock and try later
    if (!buf || buf.length === 0) { connection.flushing = false; return; }

    const sampleRate = this.connections.get(callId)?.sampleRateHz || 8000;
    const thresholdMs = 100;
    const minSamples = Math.ceil(sampleRate * (thresholdMs / 1000));
    const minBytes = minSamples * bytesPerSample; // bytes per sample depends on format

    // 1) Always append what we have first
    const appendBytes = buf.length;
    const audioAppend = { type: 'input_audio_buffer.append', audio: buf.toString('base64') };
    try { console.log(`➡️ append ${appendBytes} bytes format=${useUlaw ? 'g711_ulaw' : 'pcm16'} (pending before=${connection.pendingAppendBytes}) for ${callId}`); } catch {}
    const doAfterAppend = () => {
      // Track pending audio now on client side
      connection.pendingAppendBytes = (connection.pendingAppendBytes || 0) + appendBytes;
      try {
        const curMs = Math.round((connection.pendingAppendBytes / bytesPerSample) / sampleRate * 1000);
        console.log(`🧮 pending=${connection.pendingAppendBytes} bytes (~${curMs}ms) after append for ${callId}`);
      } catch {}

      // 2) If we still don't have enough total appended since last commit, schedule another flush without committing
      if (connection.pendingAppendBytes < minBytes) {
        // If we are very close (<=10ms), pad and commit
        const currentMs = Math.round((connection.pendingAppendBytes / bytesPerSample) / sampleRate * 1000);
        const gapMs = thresholdMs - currentMs;
        if (gapMs > 0 && gapMs <= 20) {
          const padSamples = Math.ceil(sampleRate * (gapMs / 1000));
          const padBytes = padSamples * bytesPerSample;
          const silenceByte = useUlaw ? 0xFF : 0x00;
          const silence = Buffer.alloc(padBytes, silenceByte);
          try { console.log(`🔇 Padding ${padBytes} bytes (~${gapMs}ms) before commit for ${callId}`); } catch {}
          const padAppend = { type: 'input_audio_buffer.append', audio: silence.toString('base64') };
          connection.openaiWs.send(JSON.stringify(padAppend), () => {
            connection.pendingAppendBytes += padBytes;
            const ms = Math.round((connection.pendingAppendBytes / bytesPerSample) / sampleRate * 1000);
            try { console.log(`🔊 Committing ${connection.pendingAppendBytes} bytes (~${ms}ms) to OpenAI for ${callId}`); } catch {}
            const commit = { type: 'input_audio_buffer.commit' };
            try { connection.openaiWs.send(JSON.stringify(commit)); } catch {}
            connection.pendingAppendBytes = 0;
            connection.hasCommittedAudio = true;
            connection.flushing = false;
          });
        } else {
          connection.commitTimer = setTimeout(() => {
            this.flushAudioToOpenAI(callId).catch(err => DebugLogger.logCallError(callId, err, 'audio_flush_reschedule'));
          }, 60);
          connection.flushing = false;
        }
        return;
      }

      // 3) We have enough pending; commit now
      const ms = Math.round((connection.pendingAppendBytes / bytesPerSample) / sampleRate * 1000);
      try { console.log(`🔊 Committing ${connection.pendingAppendBytes} bytes (~${ms}ms) to OpenAI for ${callId}`); } catch {}
      const commit = { type: 'input_audio_buffer.commit' };
      try { connection.openaiWs.send(JSON.stringify(commit)); } catch {}
      connection.pendingAppendBytes = 0;
      connection.hasCommittedAudio = true;
      connection.flushing = false;
    };

    // Directly append without unsupported 'start' primitive
    connection.openaiWs.send(JSON.stringify(audioAppend), doAfterAppend);
  }

  /**
   * Lazily connect to OpenAI Realtime and configure session
   */
  async ensureOpenAIConnected(callId) {
    const connection = this.connections.get(callId);
    if (!connection || connection.openaiConnected || connection.openaiConnecting) return;
    connection.openaiConnecting = true;

    const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    connection.openaiWs = openaiWs;

    openaiWs.on('open', () => {
      console.log(`🤖 OpenAI Realtime connected for call ${callId}`);
      DebugLogger.logSuccess('OpenAI Realtime connected', { callId });

      const conn = this.connections.get(callId);
      // Choose input format based on Twilio media
      const fmt = (conn?.inputFormatType === 'g711_ulaw') ? 'g711_ulaw' : 'pcm16';
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: this.buildRealtimeInstructions(conn.leadData),
          voice: 'alloy',
          input_audio_format: fmt,
          output_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          tools: [],
          tool_choice: 'auto',
          temperature: 0.8,
          max_response_output_tokens: 4096
        }
      };
      openaiWs.send(JSON.stringify(sessionConfig));
      connection.openaiConnected = true;
      connection.openaiConnecting = false;
    });

    openaiWs.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 OpenAI message for ${callId}:`, message.type);
        if (message.type === 'session.updated') {
          const conn = this.connections.get(callId);
          if (conn) {
            conn.sessionReady = true;
            console.log(`✅ OpenAI session updated for ${callId}`);
            if (conn.pcmBuffer && conn.pcmBuffer.length > 0 && !conn.commitTimer) {
              conn.commitTimer = setTimeout(() => {
                this.flushAudioToOpenAI(callId).catch(err => DebugLogger.logCallError(callId, err, 'flush_after_session_ready'));
              }, 80);
            }
          }
          return;
        }
        await this.handleOpenAIMessage(callId, message);
        if (message.type === 'error' && message.error && typeof message.error.message === 'string' && message.error.message.includes('buffer too small')) {
          // Try scheduling another flush with more audio
          const conn = this.connections.get(callId);
          if (conn) {
            conn.hasCommittedAudio = false; // reapply stricter thresholds
            clearTimeout(conn.commitTimer);
            conn.commitTimer = setTimeout(() => {
              this.flushAudioToOpenAI(callId).catch(err => DebugLogger.logCallError(callId, err, 'retry_after_small_buffer'));
            }, 200);
          }
        }
      } catch (error) {
        console.error(`❌ Error handling OpenAI message for ${callId}:`, error);
      }
    });

    openaiWs.on('error', (error) => {
      console.error(`❌ OpenAI WebSocket error for ${callId}:`, error);
      DebugLogger.logCallError(callId, error, 'openai_websocket');
    });

    openaiWs.on('close', (code, reason) => {
      console.log(`🔌 OpenAI WebSocket closed for ${callId}:`, code, reason?.toString?.());
      const conn = this.connections.get(callId);
      if (conn) {
        conn.openaiConnected = false;
        conn.openaiConnecting = false;
      }
    });
  }

  /**
   * Start the conversation with a greeting
   */
  async initiateGreeting(callId) {
    const connection = this.connections.get(callId);
    if (!connection) return;

    const greeting = `Hello, is this ${connection.leadData.firstName} ${connection.leadData.lastName}?`;
    
    // Speak greeting with ElevenLabs so caller hears audio promptly
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
