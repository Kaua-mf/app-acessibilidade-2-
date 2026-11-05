/**
 * WAV Tone Generator (funções puras, sem dependência de React Native)
 *
 * O React Native não tem Web Audio API (AudioContext), então no celular o
 * apito é tocado pelo expo-audio a partir de pequenos arquivos WAV gerados
 * aqui. Cada arquivo contém um número inteiro de ciclos de uma senoide, então
 * pode tocar em loop sem estalo na emenda.
 */

import { bytesToBase64 } from './frame-sampling';

export const WAV_SAMPLE_RATE = 22050;

/** Faixa de frequências do apito (mesma de lightPercentageToFrequency). */
export const TONE_MIN_HZ = 200;
export const TONE_MAX_HZ = 2000;

/**
 * Quantidade de tons pré-definidos entre TONE_MIN_HZ e TONE_MAX_HZ.
 * 24 passos em ~3,3 oitavas dão ~1,7 semitom por passo.
 */
export const TONE_STEPS = 24;

/** Duração de cada trecho em loop, em segundos. */
const DEFAULT_LOOP_SECONDS = 1;

/** Frequência (Hz) do passo `step` (0 a TONE_STEPS - 1), em espaçamento logarítmico. */
export function toneStepFrequency(step: number): number {
  const clamped = Math.max(0, Math.min(TONE_STEPS - 1, Math.round(step)));
  const fraction = clamped / (TONE_STEPS - 1);
  return TONE_MIN_HZ * Math.pow(TONE_MAX_HZ / TONE_MIN_HZ, fraction);
}

/** Passo mais próximo de uma frequência qualquer. */
export function frequencyToToneStep(frequency: number): number {
  const clamped = Math.max(TONE_MIN_HZ, Math.min(TONE_MAX_HZ, frequency));
  const fraction = Math.log(clamped / TONE_MIN_HZ) / Math.log(TONE_MAX_HZ / TONE_MIN_HZ);
  return Math.round(fraction * (TONE_STEPS - 1));
}

export interface ToneWavOptions {
  sampleRate?: number;
  /** Duração aproximada do trecho em loop, em segundos. */
  seconds?: number;
  /** Amplitude de 0 a 1 (o volume final é controlado pelo player). */
  amplitude?: number;
}

/**
 * Número de amostras do trecho e frequência real que ele reproduz.
 * O trecho tem um número inteiro de ciclos, então a frequência real fica
 * muito próxima da pedida (diferença menor que 0,1%).
 */
export function toneLoopLayout(
  frequency: number,
  sampleRate: number = WAV_SAMPLE_RATE,
  seconds: number = DEFAULT_LOOP_SECONDS
): { samples: number; cycles: number; actualFrequency: number } {
  const cycles = Math.max(1, Math.round(frequency * seconds));
  const samples = Math.max(2, Math.round((cycles * sampleRate) / frequency));
  return { samples, cycles, actualFrequency: (cycles * sampleRate) / samples };
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/** Gera um arquivo WAV (PCM 16 bits, mono) com uma senoide em loop perfeito. */
export function generateToneWav(frequency: number, options: ToneWavOptions = {}): Uint8Array {
  const sampleRate = options.sampleRate ?? WAV_SAMPLE_RATE;
  const amplitude = Math.max(0, Math.min(1, options.amplitude ?? 0.9));
  const { samples, cycles } = toneLoopLayout(frequency, sampleRate, options.seconds);

  const dataBytes = samples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // tamanho do bloco fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes por segundo
  view.setUint16(32, 2, true); // bytes por amostra
  view.setUint16(34, 16, true); // bits por amostra
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples; i++) {
    const value = Math.sin((2 * Math.PI * cycles * i) / samples) * amplitude * 32767;
    view.setInt16(44 + i * 2, Math.round(value), true);
  }

  return new Uint8Array(buffer);
}

/** Mesmo que generateToneWav, já em base64 (para gravar em arquivo). */
export function generateToneWavBase64(frequency: number, options: ToneWavOptions = {}): string {
  return bytesToBase64(generateToneWav(frequency, options));
}
