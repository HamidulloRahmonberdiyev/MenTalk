import { File, Paths } from 'expo-file-system';

import type { SpeechData } from './client';

/** Reads a recording (file:// uri) as base64 for the API. */
export function readBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Prepends a 44-byte RIFF/WAVE header so the PCM can be played from a file. */
function pcmToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const wav = new Uint8Array(44 + pcm.length);
  const view = new DataView(wav.buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) wav[offset + i] = text.charCodeAt(i);
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, (channels * bitsPerSample) / 8, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return wav;
}

export interface SpeechFile {
  uri: string;
  durationMs: number;
  delete: () => void;
}

/** Saves synthesized speech to the cache as a playable .wav file. */
export function writeSpeechFile(name: string, speech: SpeechData): SpeechFile {
  const audio = base64ToBytes(speech.base64);
  const isWav = speech.mimeType.includes('wav') || String.fromCharCode(...audio.subarray(0, 4)) === 'RIFF';

  // Gemini normally returns a finished WAV; raw PCM gets a header added.
  const wav = isWav ? audio : pcmToWav(audio, speech.sampleRate);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const byteRate = view.getUint32(28, true);
  const durationMs = byteRate > 0 ? Math.round(((wav.length - 44) / byteRate) * 1000) : 0;

  const file = new File(Paths.cache, `${name}.wav`);
  file.create({ overwrite: true });
  file.write(wav);

  return {
    uri: file.uri,
    durationMs,
    delete: () => {
      try {
        if (file.exists) file.delete();
      } catch {
        // Cache files are disposable.
      }
    },
  };
}
