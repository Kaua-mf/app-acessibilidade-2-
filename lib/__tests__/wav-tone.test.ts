import { describe, it, expect } from 'vitest';
import { base64ToBytes } from '../frame-sampling';
import {
  TONE_MAX_HZ,
  TONE_MIN_HZ,
  TONE_STEPS,
  WAV_SAMPLE_RATE,
  frequencyToToneStep,
  generateToneWav,
  generateToneWavBase64,
  toneLoopLayout,
  toneStepFrequency,
} from '../wav-tone';

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...Array.from(bytes.slice(offset, offset + length)));
}

function toSamples(wav: Uint8Array): number[] {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const samples: number[] = [];
  for (let i = 44; i + 1 < wav.length; i += 2) {
    samples.push(view.getInt16(i, true));
  }
  return samples;
}

function countRisingZeroCrossings(samples: number[]): number {
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i - 1] < 0 && samples[i] >= 0) crossings++;
  }
  return crossings;
}

describe('WAV Tone', () => {
  describe('tone steps', () => {
    it('should start at the minimum and end at the maximum frequency', () => {
      expect(toneStepFrequency(0)).toBeCloseTo(TONE_MIN_HZ, 6);
      expect(toneStepFrequency(TONE_STEPS - 1)).toBeCloseTo(TONE_MAX_HZ, 6);
    });

    it('should increase with every step', () => {
      for (let step = 1; step < TONE_STEPS; step++) {
        expect(toneStepFrequency(step)).toBeGreaterThan(toneStepFrequency(step - 1));
      }
    });

    it('should keep a constant ratio between steps (logarithmic spacing)', () => {
      const first = toneStepFrequency(1) / toneStepFrequency(0);
      const last = toneStepFrequency(TONE_STEPS - 1) / toneStepFrequency(TONE_STEPS - 2);
      expect(first).toBeCloseTo(last, 6);
    });

    it('should round trip a step through its frequency', () => {
      for (let step = 0; step < TONE_STEPS; step++) {
        expect(frequencyToToneStep(toneStepFrequency(step))).toBe(step);
      }
    });

    it('should clamp frequencies outside the range', () => {
      expect(frequencyToToneStep(50)).toBe(0);
      expect(frequencyToToneStep(9000)).toBe(TONE_STEPS - 1);
    });
  });

  describe('toneLoopLayout', () => {
    it('should reproduce the requested frequency within 0.1%', () => {
      for (let step = 0; step < TONE_STEPS; step++) {
        const frequency = toneStepFrequency(step);
        const { actualFrequency } = toneLoopLayout(frequency);
        expect(Math.abs(actualFrequency - frequency) / frequency).toBeLessThan(0.001);
      }
    });

    it('should last about one second', () => {
      const { samples } = toneLoopLayout(440);
      expect(samples).toBeGreaterThan(WAV_SAMPLE_RATE * 0.95);
      expect(samples).toBeLessThan(WAV_SAMPLE_RATE * 1.05);
    });
  });

  describe('generateToneWav', () => {
    it('should write a valid PCM 16-bit mono header', () => {
      const wav = generateToneWav(440);
      const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

      expect(readAscii(wav, 0, 4)).toBe('RIFF');
      expect(readAscii(wav, 8, 4)).toBe('WAVE');
      expect(readAscii(wav, 12, 4)).toBe('fmt ');
      expect(view.getUint16(20, true)).toBe(1); // PCM
      expect(view.getUint16(22, true)).toBe(1); // mono
      expect(view.getUint32(24, true)).toBe(WAV_SAMPLE_RATE);
      expect(view.getUint32(28, true)).toBe(WAV_SAMPLE_RATE * 2);
      expect(view.getUint16(32, true)).toBe(2);
      expect(view.getUint16(34, true)).toBe(16);
      expect(readAscii(wav, 36, 4)).toBe('data');
    });

    it('should have consistent chunk sizes', () => {
      const wav = generateToneWav(880);
      const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
      expect(view.getUint32(40, true)).toBe(wav.length - 44);
      expect(view.getUint32(4, true)).toBe(wav.length - 8);
    });

    it('should contain the number of samples from toneLoopLayout', () => {
      const wav = generateToneWav(440);
      expect(toSamples(wav)).toHaveLength(toneLoopLayout(440).samples);
    });

    it('should oscillate at the requested frequency', () => {
      for (const frequency of [200, 440, 1000, 2000]) {
        const samples = toSamples(generateToneWav(frequency));
        const seconds = samples.length / WAV_SAMPLE_RATE;
        const measured = countRisingZeroCrossings(samples) / seconds;
        expect(Math.abs(measured - frequency) / frequency).toBeLessThan(0.02);
      }
    });

    it('should loop without a click: starts at zero and ends where it started', () => {
      for (const frequency of [200, 333, 1234, 2000]) {
        const samples = toSamples(generateToneWav(frequency));
        expect(samples[0]).toBe(0);
        // A amostra seguinte à última seria igual à primeira (0): a última precisa
        // ser tão pequena quanto o passo entre amostras vizinhas
        const step = Math.abs(samples[1] - samples[0]);
        expect(Math.abs(samples[samples.length - 1])).toBeLessThanOrEqual(step);
      }
    });

    it('should respect the amplitude without clipping', () => {
      const samples = toSamples(generateToneWav(440, { amplitude: 0.5 }));
      const peak = Math.max(...samples.map((s) => Math.abs(s)));
      expect(peak).toBeGreaterThan(0.49 * 32767);
      expect(peak).toBeLessThanOrEqual(0.5 * 32767 + 1);
    });

    it('should encode to base64 that decodes to the same bytes', () => {
      const wav = generateToneWav(660);
      const decoded = base64ToBytes(generateToneWavBase64(660));
      expect(decoded).toHaveLength(wav.length);
      expect(Array.from(decoded.slice(0, 64))).toEqual(Array.from(wav.slice(0, 64)));
      expect(Array.from(decoded.slice(-64))).toEqual(Array.from(wav.slice(-64)));
    });
  });
});
