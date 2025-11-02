const ElevenLabs = require('elevenlabs-node');
const fs = require('fs');
const path = require('path');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.client = ElevenLabs;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Default voice
  }

  /**
   * Convert text to speech using ElevenLabs
   * @param {string} text - Text to convert to speech
   * @param {string} voiceId - Optional voice ID to use
   * @returns {Promise<Buffer>} Audio buffer
   */
  async textToSpeech(text, voiceId = null) {
    try {
      const voice = voiceId || this.voiceId;
      const axios = require('axios');

      if (!this.apiKey) {
        throw new Error('ELEVENLABS_API_KEY is missing');
      }

      console.log(`TTS Request: "${text.substring(0, 80)}..." with voice ${voice}`);

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
      const response = await axios.post(
        url,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.75,
            use_speaker_boost: true
          }
        },
        {
          responseType: 'arraybuffer',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          timeout: 20000
        }
      );

      const ct = (response.headers && response.headers['content-type']) || '';
      if (!ct.includes('audio')) {
        const txt = Buffer.from(response.data).toString('utf8');
        throw new Error(`ElevenLabs returned non-audio content: ${txt.substring(0, 200)}`);
      }

      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs TTS Error:', error.message || error);
      throw new Error(`Failed to generate speech: ${error.message}`);
    }
  }

  /**
   * Save audio buffer to file
   * @param {Buffer} audioBuffer - Audio data
   * @param {string} filename - Output filename
   * @returns {Promise<string>} File path
   */
  async saveAudioFile(audioBuffer, filename) {
    try {
      const audioDir = path.join(__dirname, '../audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      const filePath = path.join(audioDir, `${filename}.mp3`);
      fs.writeFileSync(filePath, audioBuffer);
      
      return filePath;
    } catch (error) {
      console.error('Error saving audio file:', error);
      throw new Error(`Failed to save audio file: ${error.message}`);
    }
  }

  /**
   * Get available voices
   * @returns {Promise<Array>} List of available voices
   */
  async getVoices() {
    try {
      const voices = await this.client.getVoices();
      return voices.voices;
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw new Error(`Failed to fetch voices: ${error.message}`);
    }
  }

  /**
   * Generate speech for a sales conversation segment
   * @param {string} text - Text to speak
   * @param {string} emotion - Emotion/tone (enthusiastic, professional, friendly)
   * @param {string} callId - Call ID for file naming
   * @returns {Promise<Buffer>} Audio buffer
   */
  async generateSalesAudio(text, emotion = 'professional', callId) {
    try {
      if (typeof emotion !== 'string') {
        emotion = 'professional';
      }
      console.log(`Generating ${emotion} audio for: "${text.substring(0, 50)}..."`);
      const buffer = await this.textToSpeech(text);
      return buffer;
    } catch (error) {
      console.error('Error generating sales audio:', error);
      throw new Error(`Failed to generate sales audio: ${error.message}`);
    }
  }

  /**
   * Stream text-to-speech for real-time conversation
   * @param {string} text - Text to convert
   * @param {Function} onChunk - Callback for audio chunks
   * @returns {Promise<void>}
   */
  async streamTextToSpeech(text, onChunk) {
    try {
      const stream = await this.client.textToSpeechStream({
        voiceId: this.voiceId,
        text: text,
        modelId: 'eleven_monolingual_v1',
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true
        }
      });

      stream.on('data', (chunk) => {
        onChunk(chunk);
      });

      stream.on('end', () => {
        console.log('Audio stream ended');
      });

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        throw error;
      });

    } catch (error) {
      console.error('Error streaming TTS:', error);
      throw new Error(`Failed to stream text-to-speech: ${error.message}`);
    }
  }
}

module.exports = ElevenLabsService;
