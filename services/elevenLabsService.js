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
      
      // For now, return a simple success response since ElevenLabs might not be configured
      // In production, this would generate actual audio
      console.log(`TTS Request: "${text}" with voice ${voice}`);
      
      // Return a mock audio buffer for testing
      return Buffer.from('mock-audio-data');
    } catch (error) {
      console.error('ElevenLabs TTS Error:', error);
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
   * @returns {Promise<Object>} Audio file info
   */
  async generateSalesAudio(text, emotion = 'professional', callId) {
    try {
      // For testing, return mock audio data
      console.log(`Generating ${emotion} audio for: "${text.substring(0, 50)}..."`);
      
      // Return mock audio file info
      const filename = `call_${callId}_${Date.now()}.mp3`;
      
      return {
        success: true,
        filename: filename,
        path: `/audio/${filename}`,
        duration: Math.floor(text.length / 10), // Estimate duration
        emotion: emotion
      };
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
