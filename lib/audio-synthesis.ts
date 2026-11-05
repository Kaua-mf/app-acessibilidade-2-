/**
 * Audio Synthesis Utility
 * Gera um apito de frequência variável como retorno sonoro da detecção de luz.
 *
 * A implementação de áudio depende da plataforma (veja tone-player.ts e
 * tone-player.native.ts); este arquivo expõe sempre a mesma API.
 */

import { createTonePlayer } from './tone-player';
import type { TonePlayer } from './tone-player.types';

let tonePlayer: TonePlayer | null = null;

function getPlayer(): TonePlayer {
  if (!tonePlayer) {
    tonePlayer = createTonePlayer();
  }
  return tonePlayer;
}

/**
 * Start playing a variable-frequency whistle
 * @param frequency - Frequency in Hz (200-2000 Hz recommended)
 * @param volume - Volume level (0-1)
 */
export function startWhistle(frequency: number = 1000, volume: number = 0.3): void {
  getPlayer().start(frequency, volume);
}

/**
 * Stop playing the whistle
 */
export function stopWhistle(): void {
  tonePlayer?.stop();
}

/**
 * Change the frequency of the current whistle
 * @param frequency - New frequency in Hz
 */
export function setWhistleFrequency(frequency: number): void {
  tonePlayer?.setFrequency(frequency);
}

/**
 * Set the volume of the current whistle
 * @param volume - Volume level (0-1)
 */
export function setWhistleVolume(volume: number): void {
  tonePlayer?.setVolume(volume);
}

/**
 * Convert light percentage (0-100) to frequency (200-2000 Hz)
 * Low light = low frequency, high light = high frequency
 * @param lightPercentage - Light level as percentage (0-100)
 * @returns Frequency in Hz
 */
export function lightPercentageToFrequency(lightPercentage: number): number {
  // Clamp percentage to 0-100
  const clamped = Math.max(0, Math.min(100, lightPercentage));

  // Map 0-100 to 200-2000 Hz
  // Using exponential mapping for more natural-sounding progression
  const minFreq = 200;
  const maxFreq = 2000;

  // Exponential mapping: more noticeable changes at lower light levels
  const normalized = clamped / 100;
  const frequency = minFreq * Math.pow(maxFreq / minFreq, normalized);

  return Math.round(frequency);
}

/**
 * Play a continuous whistle that updates with light changes
 * @param lightPercentage - Light level as percentage (0-100)
 * @param volume - Volume level (0-1)
 */
export function playLightDetectionWhistle(lightPercentage: number, volume: number = 0.3): void {
  const frequency = lightPercentageToFrequency(lightPercentage);
  const player = getPlayer();

  if (!player.isPlaying()) {
    player.start(frequency, volume);
  } else {
    player.setFrequency(frequency);
    player.setVolume(volume);
  }
}

/**
 * Play a short beep sound (for button feedback)
 * @param frequency - Frequency in Hz
 * @param duration - Duration in milliseconds
 * @param volume - Volume level (0-1)
 */
export function playBeep(
  frequency: number = 800,
  duration: number = 100,
  volume: number = 0.3
): void {
  getPlayer().beep(frequency, duration, volume);
}

/**
 * Clean up audio resources
 */
export function cleanup(): void {
  tonePlayer?.dispose();
  tonePlayer = null;
}

/**
 * Check if audio is currently playing
 */
export function isAudioPlaying(): boolean {
  return tonePlayer?.isPlaying() ?? false;
}
