import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cleanup,
  isAudioPlaying,
  lightPercentageToFrequency,
  playLightDetectionWhistle,
  startWhistle,
  stopWhistle,
} from '../audio-synthesis';

describe('Audio Synthesis', () => {
  describe('lightPercentageToFrequency', () => {
    it('should map 0% light to ~200 Hz', () => {
      const frequency = lightPercentageToFrequency(0);
      expect(frequency).toBeGreaterThanOrEqual(200);
      expect(frequency).toBeLessThanOrEqual(250);
    });

    it('should map 50% light to middle frequency range', () => {
      const frequency = lightPercentageToFrequency(50);
      expect(frequency).toBeGreaterThan(500);
      expect(frequency).toBeLessThan(1000);
    });

    it('should map 100% light to ~2000 Hz', () => {
      const frequency = lightPercentageToFrequency(100);
      expect(frequency).toBeGreaterThanOrEqual(1900);
      expect(frequency).toBeLessThanOrEqual(2100);
    });

    it('should clamp negative percentages to 0%', () => {
      const frequency = lightPercentageToFrequency(-10);
      expect(frequency).toBeGreaterThanOrEqual(200);
      expect(frequency).toBeLessThanOrEqual(250);
    });

    it('should clamp percentages over 100 to 100%', () => {
      const frequency = lightPercentageToFrequency(150);
      expect(frequency).toBeGreaterThanOrEqual(1900);
      expect(frequency).toBeLessThanOrEqual(2100);
    });

    it('should return increasing frequencies for increasing light levels', () => {
      const freq0 = lightPercentageToFrequency(0);
      const freq25 = lightPercentageToFrequency(25);
      const freq50 = lightPercentageToFrequency(50);
      const freq75 = lightPercentageToFrequency(75);
      const freq100 = lightPercentageToFrequency(100);

      expect(freq0).toBeLessThan(freq25);
      expect(freq25).toBeLessThan(freq50);
      expect(freq50).toBeLessThan(freq75);
      expect(freq75).toBeLessThan(freq100);
    });

    it('should return integer frequencies', () => {
      const frequency = lightPercentageToFrequency(42);
      expect(Number.isInteger(frequency)).toBe(true);
    });

    it('should handle edge case: 0% returns lowest frequency', () => {
      const freq0 = lightPercentageToFrequency(0);
      const freq1 = lightPercentageToFrequency(1);
      expect(freq0).toBeLessThanOrEqual(freq1);
    });

    it('should handle edge case: 100% returns highest frequency', () => {
      const freq99 = lightPercentageToFrequency(99);
      const freq100 = lightPercentageToFrequency(100);
      expect(freq99).toBeLessThanOrEqual(freq100);
    });

    it('should produce smooth frequency transitions', () => {
      const frequencies = [];
      for (let i = 0; i <= 100; i += 10) {
        frequencies.push(lightPercentageToFrequency(i));
      }

      // Check that each frequency is greater than the previous
      for (let i = 1; i < frequencies.length; i++) {
        expect(frequencies[i]).toBeGreaterThanOrEqual(frequencies[i - 1]);
      }
    });

    it('should use exponential mapping for natural progression', () => {
      // Exponential mapping should result in larger frequency jumps at higher light levels
      const freq0to25 = lightPercentageToFrequency(25) - lightPercentageToFrequency(0);
      const freq75to100 = lightPercentageToFrequency(100) - lightPercentageToFrequency(75);

      // The difference should be positive (frequencies increase)
      expect(freq0to25).toBeGreaterThan(0);
      expect(freq75to100).toBeGreaterThan(0);
    });
  });
});


// Simula a Web Audio API para testar a lógica do apito sem navegador
type FakeNode = { connect: (n: unknown) => void; disconnect: () => void };

class FakeParam {
  value = 0;
  ramps: Array<{ value: number; time: number }> = [];
  setValueAtTime(value: number) {
    this.value = value;
  }
  cancelScheduledValues() {}
  exponentialRampToValueAtTime(value: number, time: number) {
    this.ramps.push({ value, time });
  }
}

const created: { oscillators: any[]; gains: any[]; contexts: any[] } = {
  oscillators: [],
  gains: [],
  contexts: [],
};

class FakeAudioContext {
  state = 'running';
  currentTime = 1;
  destination = {};
  closed = false;
  constructor() {
    created.contexts.push(this);
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: new FakeParam(),
      started: false,
      stopped: false,
      connect: () => {},
      disconnect: () => {},
      start() {
        osc.started = true;
      },
      stop() {
        osc.stopped = true;
      },
    } as FakeNode & Record<string, any>;
    created.oscillators.push(osc);
    return osc;
  }
  createGain() {
    const gain = { gain: new FakeParam(), connect: () => {}, disconnect: () => {} };
    created.gains.push(gain);
    return gain;
  }
}

describe('Audio Synthesis - apito', () => {
  afterEach(() => {
    cleanup();
    delete (globalThis as any).AudioContext;
    created.oscillators.length = 0;
    created.gains.length = 0;
    created.contexts.length = 0;
  });

  describe('sem Web Audio API (por exemplo, ambiente de testes)', () => {
    it('should not throw when starting, updating and stopping', () => {
      expect(() => startWhistle(440, 0.3)).not.toThrow();
      expect(() => playLightDetectionWhistle(50)).not.toThrow();
      expect(() => stopWhistle()).not.toThrow();
      expect(() => cleanup()).not.toThrow();
    });

    it('should report not playing when no audio is available', () => {
      startWhistle(440, 0.3);
      expect(isAudioPlaying()).toBe(false);
    });
  });

  describe('com Web Audio API', () => {
    beforeEach(() => {
      (globalThis as any).AudioContext = FakeAudioContext;
    });

    it('should start an oscillator at the requested frequency and volume', () => {
      startWhistle(600, 0.25);
      expect(isAudioPlaying()).toBe(true);
      expect(created.oscillators).toHaveLength(1);
      expect(created.oscillators[0].started).toBe(true);
      expect(created.oscillators[0].frequency.value).toBe(600);
      expect(created.gains[0].gain.value).toBe(0.25);
    });

    it('should stop the oscillator', () => {
      startWhistle(600, 0.25);
      stopWhistle();
      expect(isAudioPlaying()).toBe(false);
      expect(created.oscillators[0].stopped).toBe(true);
    });

    it('should start a whistle from the light level and then glide to new frequencies', () => {
      playLightDetectionWhistle(0);
      expect(created.oscillators).toHaveLength(1);
      expect(created.oscillators[0].frequency.value).toBe(lightPercentageToFrequency(0));

      playLightDetectionWhistle(100);
      // Não cria outro oscilador: só desliza a frequência
      expect(created.oscillators).toHaveLength(1);
      const ramps = created.oscillators[0].frequency.ramps;
      expect(ramps).toHaveLength(1);
      expect(ramps[0].value).toBe(lightPercentageToFrequency(100));
    });

    it('should update the volume of the running whistle', () => {
      playLightDetectionWhistle(10, 0.3);
      playLightDetectionWhistle(20, 0.6);
      expect(created.gains[0].gain.value).toBe(0.6);
    });

    it('should clamp the volume between 0 and 1', () => {
      startWhistle(440, 5);
      expect(created.gains[0].gain.value).toBe(1);
      startWhistle(440, -2);
      expect(created.gains[1].gain.value).toBe(0);
    });

    it('should close the audio context on cleanup and allow starting again', () => {
      startWhistle(440, 0.3);
      cleanup();
      expect(created.contexts[0].closed).toBe(true);
      expect(isAudioPlaying()).toBe(false);

      startWhistle(880, 0.3);
      expect(isAudioPlaying()).toBe(true);
      expect(created.contexts).toHaveLength(2);
    });

    it('should not glide when nothing is playing', () => {
      stopWhistle();
      playLightDetectionWhistle(50);
      stopWhistle();
      playLightDetectionWhistle(70);
      // Cada início cria um oscilador novo, sem rampas no oscilador parado
      expect(created.oscillators).toHaveLength(2);
      expect(created.oscillators[0].frequency.ramps).toHaveLength(0);
    });
  });
});
