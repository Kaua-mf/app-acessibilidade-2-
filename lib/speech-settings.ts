/**
 * Speech Settings Utility
 * Manages text-to-speech configuration using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SpeechSettings {
  rate: number; // 0.5-2.0, default 0.9
  pitch: number; // 0.5-2.0, default 1.0
  volume: number; // 0-1, default 1.0
  enabled: boolean; // default true
}

export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  rate: 0.9,
  pitch: 1.0,
  volume: 1.0,
  enabled: true,
};

const STORAGE_KEY = '@acessibilidade_visual_speech';

/**
 * Load speech settings from AsyncStorage
 */
export async function loadSpeechSettings(): Promise<SpeechSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_SPEECH_SETTINGS;
  } catch (error) {
    console.error('Error loading speech settings:', error);
    return DEFAULT_SPEECH_SETTINGS;
  }
}

/**
 * Save speech settings to AsyncStorage
 */
export async function saveSpeechSettings(settings: SpeechSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving speech settings:', error);
  }
}

/**
 * Reset speech settings to defaults
 */
export async function resetSpeechSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting speech settings:', error);
  }
}

/**
 * Update a specific speech setting
 */
export async function updateSpeechSetting<K extends keyof SpeechSettings>(
  key: K,
  value: SpeechSettings[K]
): Promise<SpeechSettings> {
  const current = await loadSpeechSettings();
  const updated = { ...current, [key]: value };
  await saveSpeechSettings(updated);
  return updated;
}

/**
 * Get description of current speech rate
 */
export function getSpeechRateDescription(rate: number): string {
  if (rate < 0.7) return 'Muito Lento';
  if (rate < 0.85) return 'Lento';
  if (rate < 1.0) return 'Normal';
  if (rate < 1.2) return 'Rápido';
  return 'Muito Rápido';
}

/**
 * Get description of current pitch
 */
export function getPitchDescription(pitch: number): string {
  if (pitch < 0.8) return 'Grave';
  if (pitch <= 1.0) return 'Normal';
  if (pitch < 1.3) return 'Agudo';
  return 'Muito Agudo';
}

/**
 * Validate speech settings
 */
export function validateSpeechSettings(settings: Partial<SpeechSettings>): boolean {
  if (settings.rate !== undefined) {
    if (settings.rate < 0.5 || settings.rate > 2.0) return false;
  }
  if (settings.pitch !== undefined) {
    if (settings.pitch < 0.5 || settings.pitch > 2.0) return false;
  }
  if (settings.volume !== undefined) {
    if (settings.volume < 0 || settings.volume > 1) return false;
  }
  return true;
}
