/**
 * Calibration Settings Utility
 * Manages color detection sensitivity settings using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CalibrationSettings {
  colorSensitivity: number; // 0-100, default 50
  minConfidence: number; // 0-100, default 70
  regionSize: number; // 5-50, default 20 (pixels)
  updateFrequency: number; // 200-1000ms, default 500
  preset: 'custom' | 'interior' | 'exterior' | 'low-light';
  // autoWhiteBalance: boolean; // REMOVIDO - agora é sempre automático
}

export const DEFAULT_SETTINGS: CalibrationSettings = {
  colorSensitivity: 50,
  minConfidence: 70,
  regionSize: 20,
  updateFrequency: 500,
  preset: 'custom',
};

// Presets for different lighting conditions
export const CALIBRATION_PRESETS: Record<string, CalibrationSettings> = {
  interior: {
    colorSensitivity: 60,
    minConfidence: 65,
    regionSize: 25,
    updateFrequency: 500,
    preset: 'interior',
  },
  exterior: {
    colorSensitivity: 40,
    minConfidence: 75,
    regionSize: 15,
    updateFrequency: 300,
    preset: 'exterior',
  },
  'low-light': {
    colorSensitivity: 80,
    minConfidence: 50,
    regionSize: 30,
    updateFrequency: 800,
    preset: 'low-light',
  },
};

const STORAGE_KEY = '@acessibilidade_visual_calibration';

/**
 * Load calibration settings from AsyncStorage
 */
export async function loadCalibrationSettings(): Promise<CalibrationSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading calibration settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save calibration settings to AsyncStorage
 */
export async function saveCalibrationSettings(settings: CalibrationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving calibration settings:', error);
  }
}

/**
 * Reset calibration settings to defaults
 */
export async function resetCalibrationSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting calibration settings:', error);
  }
}

/**
 * Apply a preset to calibration settings
 */
export async function applyPreset(presetName: keyof typeof CALIBRATION_PRESETS): Promise<CalibrationSettings> {
  const preset = CALIBRATION_PRESETS[presetName];
  if (preset) {
    await saveCalibrationSettings(preset);
    return preset;
  }
  return DEFAULT_SETTINGS;
}

/**
 * Update a specific calibration setting
 */
export async function updateCalibrationSetting<K extends keyof CalibrationSettings>(
  key: K,
  value: CalibrationSettings[K]
): Promise<CalibrationSettings> {
  const current = await loadCalibrationSettings();
  const updated = { ...current, [key]: value };
  await saveCalibrationSettings(updated);
  return updated;
}

/**
 * Calculate color distance threshold based on sensitivity
 * Lower sensitivity = more tolerant (larger threshold)
 * Higher sensitivity = more strict (smaller threshold)
 */
export function calculateColorDistanceThreshold(sensitivity: number): number {
  // Sensitivity range: 0-100
  // Threshold range: 441 (max distance) down to 50 (very strict)
  // At 50 sensitivity: threshold = 220 (medium)
  // At 0 sensitivity: threshold = 441 (very tolerant)
  // At 100 sensitivity: threshold = 50 (very strict)
  
  const normalized = sensitivity / 100;
  const maxThreshold = 441;
  const minThreshold = 50;
  
  return maxThreshold - (normalized * (maxThreshold - minThreshold));
}

/**
 * Get description of current calibration
 */
export function getCalibrationDescription(settings: CalibrationSettings): string {
  switch (settings.preset) {
    case 'interior':
      return 'Calibrado para ambientes internos com iluminação artificial';
    case 'exterior':
      return 'Calibrado para ambientes externos com luz natural';
    case 'low-light':
      return 'Calibrado para ambientes com baixa iluminação';
    default:
      return `Calibração personalizada (Sensibilidade: ${settings.colorSensitivity}%)`;
  }
}

/**
 * Validate calibration settings
 */
export function validateCalibrationSettings(settings: Partial<CalibrationSettings>): boolean {
  if (settings.colorSensitivity !== undefined) {
    if (settings.colorSensitivity < 0 || settings.colorSensitivity > 100) return false;
  }
  if (settings.minConfidence !== undefined) {
    if (settings.minConfidence < 0 || settings.minConfidence > 100) return false;
  }
  if (settings.regionSize !== undefined) {
    if (settings.regionSize < 5 || settings.regionSize > 50) return false;
  }
  if (settings.updateFrequency !== undefined) {
    if (settings.updateFrequency < 200 || settings.updateFrequency > 1000) return false;
  }
  return true;
}
