/**
 * Gerador de apito para a web (Web Audio API).
 *
 * No Android e no iOS o Metro usa tone-player.native.ts no lugar deste
 * arquivo, porque o React Native não tem AudioContext.
 */

import type { TonePlayer } from './tone-player.types';

type AudioContextConstructor = new () => AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  const scope = globalThis as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

export function createTonePlayer(): TonePlayer {
  let context: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let gainNode: GainNode | null = null;
  let playing = false;
  let warned = false;

  const getContext = (): AudioContext | null => {
    if (context) return context;
    const Constructor = getAudioContextConstructor();
    if (!Constructor) {
      if (!warned) {
        warned = true;
        console.warn('Web Audio API indisponível: o apito não vai tocar neste ambiente.');
      }
      return null;
    }
    context = new Constructor();
    return context;
  };

  const clampVolume = (volume: number) => Math.max(0, Math.min(1, volume));

  const stop = () => {
    if (oscillator) {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch (error) {
        console.error('Error stopping whistle:', error);
      }
    }
    oscillator = null;
    playing = false;
  };

  return {
    start(frequency, volume) {
      try {
        if (playing) stop();
        const ctx = getContext();
        if (!ctx) return;

        // Navegadores (e o iOS) podem deixar o contexto suspenso até um toque
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        gainNode = ctx.createGain();
        gainNode.gain.value = clampVolume(volume);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        playing = true;
      } catch (error) {
        console.error('Error starting whistle:', error);
      }
    },

    setFrequency(frequency) {
      try {
        if (oscillator && context && playing) {
          const now = context.currentTime;
          oscillator.frequency.cancelScheduledValues(now);
          oscillator.frequency.setValueAtTime(oscillator.frequency.value, now);
          // Transição suave de 50 ms
          oscillator.frequency.exponentialRampToValueAtTime(frequency, now + 0.05);
        }
      } catch (error) {
        console.error('Error setting whistle frequency:', error);
      }
    },

    setVolume(volume) {
      try {
        if (gainNode) {
          gainNode.gain.value = clampVolume(volume);
        }
      } catch (error) {
        console.error('Error setting whistle volume:', error);
      }
    },

    stop,

    beep(frequency, durationMs, volume) {
      try {
        const ctx = getContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency;
        osc.type = 'sine';

        gain.gain.setValueAtTime(clampVolume(volume), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + durationMs / 1000);
      } catch (error) {
        console.error('Error playing beep:', error);
      }
    },

    dispose() {
      stop();
      if (context) {
        void context.close();
        context = null;
      }
      gainNode = null;
    },

    isPlaying() {
      return playing;
    },
  };
}
