import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalibrationSettings,
  DEFAULT_SETTINGS,
  CALIBRATION_PRESETS,
  loadCalibrationSettings,
  saveCalibrationSettings,
  resetCalibrationSettings,
  applyPreset,
  getCalibrationDescription,
  validateCalibrationSettings,
  calculateColorDistanceThreshold,
} from '../calibration-settings';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('Calibration Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have valid default settings', () => {
      expect(DEFAULT_SETTINGS.colorSensitivity).toBe(50);
      expect(DEFAULT_SETTINGS.minConfidence).toBe(70);
      expect(DEFAULT_SETTINGS.regionSize).toBe(20);
      expect(DEFAULT_SETTINGS.updateFrequency).toBe(500);
      expect(DEFAULT_SETTINGS.preset).toBe('custom');
    });
  });

  describe('CALIBRATION_PRESETS', () => {
    it('should have interior preset', () => {
      const preset = CALIBRATION_PRESETS.interior;
      expect(preset).toBeDefined();
      expect(preset.preset).toBe('interior');
      expect(preset.colorSensitivity).toBe(60);
    });

    it('should have exterior preset', () => {
      const preset = CALIBRATION_PRESETS.exterior;
      expect(preset).toBeDefined();
      expect(preset.preset).toBe('exterior');
      expect(preset.colorSensitivity).toBe(40);
    });

    it('should have low-light preset', () => {
      const preset = CALIBRATION_PRESETS['low-light'];
      expect(preset).toBeDefined();
      expect(preset.preset).toBe('low-light');
      expect(preset.colorSensitivity).toBe(80);
    });

    it('all presets should have valid settings', () => {
      Object.values(CALIBRATION_PRESETS).forEach((preset) => {
        expect(validateCalibrationSettings(preset)).toBe(true);
      });
    });
  });

  describe('loadCalibrationSettings', () => {
    it('should load settings from AsyncStorage', async () => {
      const mockSettings: CalibrationSettings = {
        colorSensitivity: 75,
        minConfidence: 80,
        regionSize: 25,
        updateFrequency: 600,
        preset: 'custom',
      };

      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(mockSettings));

      const result = await loadCalibrationSettings();
      expect(result).toEqual(mockSettings);
    });

    it('should return default settings if none stored', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);

      const result = await loadCalibrationSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it('should return default settings on error', async () => {
      vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Storage error'));

      const result = await loadCalibrationSettings();
      expect(result).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('saveCalibrationSettings', () => {
    it('should save settings to AsyncStorage', async () => {
      const settings: CalibrationSettings = {
        colorSensitivity: 60,
        minConfidence: 75,
        regionSize: 22,
        updateFrequency: 550,
        preset: 'custom',
      };

      await saveCalibrationSettings(settings);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@acessibilidade_visual_calibration',
        JSON.stringify(settings)
      );
    });

    it('should handle save errors gracefully', async () => {
      const settings = DEFAULT_SETTINGS;
      vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Save error'));

      // Should not throw
      await expect(saveCalibrationSettings(settings)).resolves.toBeUndefined();
    });
  });

  describe('resetCalibrationSettings', () => {
    it('should remove settings from AsyncStorage', async () => {
      await resetCalibrationSettings();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@acessibilidade_visual_calibration');
    });
  });

  describe('applyPreset', () => {
    it('should apply interior preset', async () => {
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

      const result = await applyPreset('interior');

      expect(result).toEqual(CALIBRATION_PRESETS.interior);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should apply exterior preset', async () => {
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

      const result = await applyPreset('exterior');

      expect(result).toEqual(CALIBRATION_PRESETS.exterior);
    });

    it('should apply low-light preset', async () => {
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

      const result = await applyPreset('low-light');

      expect(result).toEqual(CALIBRATION_PRESETS['low-light']);
    });
  });

  describe('getCalibrationDescription', () => {
    it('should return interior description', () => {
      const description = getCalibrationDescription(CALIBRATION_PRESETS.interior);
      expect(description).toContain('internos');
    });

    it('should return exterior description', () => {
      const description = getCalibrationDescription(CALIBRATION_PRESETS.exterior);
      expect(description).toContain('externos');
    });

    it('should return low-light description', () => {
      const description = getCalibrationDescription(CALIBRATION_PRESETS['low-light']);
      expect(description).toContain('baixa');
    });

    it('should return custom description for custom preset', () => {
      const customSettings: CalibrationSettings = {
        ...DEFAULT_SETTINGS,
        colorSensitivity: 65,
      };
      const description = getCalibrationDescription(customSettings);
      expect(description).toContain('personalizada');
      expect(description).toContain('65');
    });
  });

  describe('validateCalibrationSettings', () => {
    it('should validate correct settings', () => {
      const valid = validateCalibrationSettings(DEFAULT_SETTINGS);
      expect(valid).toBe(true);
    });

    it('should reject invalid colorSensitivity', () => {
      const invalid = validateCalibrationSettings({ colorSensitivity: 150 });
      expect(invalid).toBe(false);
    });

    it('should reject negative colorSensitivity', () => {
      const invalid = validateCalibrationSettings({ colorSensitivity: -10 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid minConfidence', () => {
      const invalid = validateCalibrationSettings({ minConfidence: 150 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid regionSize (too small)', () => {
      const invalid = validateCalibrationSettings({ regionSize: 2 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid regionSize (too large)', () => {
      const invalid = validateCalibrationSettings({ regionSize: 100 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid updateFrequency (too small)', () => {
      const invalid = validateCalibrationSettings({ updateFrequency: 100 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid updateFrequency (too large)', () => {
      const invalid = validateCalibrationSettings({ updateFrequency: 2000 });
      expect(invalid).toBe(false);
    });

    it('should accept valid regionSize values', () => {
      expect(validateCalibrationSettings({ regionSize: 5 })).toBe(true);
      expect(validateCalibrationSettings({ regionSize: 25 })).toBe(true);
      expect(validateCalibrationSettings({ regionSize: 50 })).toBe(true);
    });

    it('should accept valid updateFrequency values', () => {
      expect(validateCalibrationSettings({ updateFrequency: 200 })).toBe(true);
      expect(validateCalibrationSettings({ updateFrequency: 500 })).toBe(true);
      expect(validateCalibrationSettings({ updateFrequency: 1000 })).toBe(true);
    });
  });

  describe('calculateColorDistanceThreshold', () => {
    it('should return max threshold at 0 sensitivity', () => {
      const threshold = calculateColorDistanceThreshold(0);
      expect(threshold).toBe(441);
    });

    it('should return min threshold at 100 sensitivity', () => {
      const threshold = calculateColorDistanceThreshold(100);
      expect(threshold).toBe(50);
    });

    it('should return medium threshold at 50 sensitivity', () => {
      const threshold = calculateColorDistanceThreshold(50);
      expect(threshold).toBeCloseTo(245.5, 1);
    });

    it('should increase threshold with lower sensitivity', () => {
      const low = calculateColorDistanceThreshold(25);
      const high = calculateColorDistanceThreshold(75);
      expect(low).toBeGreaterThan(high);
    });

    it('should return values in valid range', () => {
      for (let i = 0; i <= 100; i += 10) {
        const threshold = calculateColorDistanceThreshold(i);
        expect(threshold).toBeGreaterThanOrEqual(50);
        expect(threshold).toBeLessThanOrEqual(441);
      }
    });
  });
});
