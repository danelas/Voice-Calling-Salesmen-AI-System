const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// Decode a single 8-bit mu-law sample to 16-bit PCM
function muLawDecodeSample(uVal) {
  let u = ~uVal & 0xff;
  let sign = (u & 0x80);
  let exponent = (u >> 4) & 0x07;
  let mantissa = u & 0x0f;
  let magnitude = ((mantissa << 4) + 0x08) << (exponent + 3);
  let sample = sign ? (0x84 - magnitude) : (magnitude - 0x84);
  // Clamp to 16-bit signed
  if (sample > 32767) sample = 32767;
  if (sample < -32768) sample = -32768;
  return sample;
}

// Convert base64 mu-law payload to PCM16 Buffer (LE)
function muLawBase64ToPCM16(base64Payload) {
  const mu = Buffer.from(base64Payload, 'base64');
  const out = Buffer.alloc(mu.length * 2);
  for (let i = 0; i < mu.length; i++) {
    const s = muLawDecodeSample(mu[i]);
    out.writeInt16LE(s, i * 2);
  }
  return out;
}

// Convert an MP3/Audio buffer to 8kHz mu-law and return an array of 20ms chunks (160 bytes each)
async function mp3ToMulawChunks(mp3Buffer, frameMs = 20) {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static not available');
  }

  // Spawn ffmpeg to transcode to raw mulaw 8k mono
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-ar', '8000',
    '-ac', '1',
    '-f', 'mulaw',
    'pipe:1'
  ];

  const proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

  const chunks = [];
  let stdoutBuffers = [];

  proc.stdout.on('data', (d) => stdoutBuffers.push(d));
  const stderrChunks = [];
  proc.stderr.on('data', (d) => stderrChunks.push(d));

  const complete = new Promise((resolve, reject) => {
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(stderrChunks).toString()}`));
      }
      resolve();
    });
  });

  // Feed input
  proc.stdin.write(mp3Buffer);
  proc.stdin.end();

  await complete;

  const mulawBuffer = Buffer.concat(stdoutBuffers);
  // 8kHz mulaw: 1 byte per sample; 20ms frame = 160 bytes
  const bytesPerFrame = Math.floor(8000 * (frameMs / 1000)); // 160
  for (let i = 0; i < mulawBuffer.length; i += bytesPerFrame) {
    const frame = mulawBuffer.slice(i, i + bytesPerFrame);
    if (frame.length === bytesPerFrame) {
      chunks.push(frame);
    }
  }
  return chunks;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  muLawBase64ToPCM16,
  mp3ToMulawChunks,
  sleep,
};
