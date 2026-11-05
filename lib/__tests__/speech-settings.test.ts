import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SpeechSettings,
  DEFAULT_SPEECH_SETTINGS,
  loadSpeechSettings,
  saveSpeechSettings,
  resetSpeechSettings,
  updateSpeechSetting,
  getSpeechRateDescription,
  getPitchDescription,
  validateSpeechSettings,
} from '../speech-settings';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('Speech Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DEFAULT_SPEECH_SETTINGS', () => {
    it('should have valid default settings', () => {
      expect(DEFAULT_SPEECH_SETTINGS.rate).toBe(0.9);
      expect(DEFAULT_SPEECH_SETTINGS.pitch).toBe(1.0);
      expect(DEFAULT_SPEECH_SETTINGS.volume).toBe(1.0);
      expect(DEFAULT_SPEECH_SETTINGS.enabled).toBe(true);
    });
  });

  describe('loadSpeechSettings', () => {
    it('should load settings from AsyncStorage', async () => {
      const mockSettings: SpeechSettings = {
        rate: 1.2,
        pitch: 0.8,
        volume: 0.9,
        enabled: true,
      };

      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(mockSettings));

      const result = await loadSpeechSettings();
      expect(result).toEqual(mockSettings);
    });

    it('should return default settings if none stored', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);

      const result = await loadSpeechSettings();
      expect(result).toEqual(DEFAULT_SPEECH_SETTINGS);
    });

    it('should return default settings on error', async () => {
      vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Storage error'));

      const result = await loadSpeechSettings();
      expect(result).toEqual(DEFAULT_SPEECH_SETTINGS);
    });
  });

  describe('saveSpeechSettings', () => {
    it('should save settings to AsyncStorage', async () => {
      const settings: SpeechSettings = {
        rate: 1.1,
        pitch: 1.1,
        volume: 0.95,
        enabled: true,
      };

      await saveSpeechSettings(settings);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@acessibilidade_visual_speech',
        JSON.stringify(settings)
      );
    });
  });

  describe('resetSpeechSettings', () => {
    it('should remove settings from AsyncStorage', async () => {
      await resetSpeechSettings();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@acessibilidade_visual_speech');
    });
  });

  describe('updateSpeechSetting', () => {
    it('should update rate setting', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(DEFAULT_SPEECH_SETTINGS));
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

      const result = await updateSpeechSetting('rate', 1.3);

      expect(result.rate).toBe(1.3);
      expect(result.pitch).toBe(DEFAULT_SPEECH_SETTINGS.pitch);
    });

    it('should update pitch setting', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(DEFAULT_SPEECH_SETTINGS));
      vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

      const result = await updateSpeechSetting('pitch', 0.7);

      expect(result.pitch).toBe(0.7);
      expect(result.rate).toBe(DEFAULT_SPEECH_SETTINGS.rate);
    });
  });

  describe('getSpeechRateDescription', () => {
    it('should return "Muito Lento" for very slow rate', () => {
      expect(getSpeechRateDescription(0.6)).toBe('Muito Lento');
    });

    it('should return "Lento" for slow rate', () => {
      expect(getSpeechRateDescription(0.75)).toBe('Lento');
    });

    it('should return "Normal" for normal rate', () => {
      expect(getSpeechRateDescription(0.9)).toBe('Normal');
    });

    it('should return "Rápido" for fast rate', () => {
      expect(getSpeechRateDescription(1.1)).toBe('Rápido');
    });

    it('should return "Muito Rápido" for very fast rate', () => {
      expect(getSpeechRateDescription(1.5)).toBe('Muito Rápido');
    });
  });

  describe('getPitchDescription', () => {
    it('should return "Grave" for low pitch', () => {
      expect(getPitchDescription(0.7)).toBe('Grave');
    });

    it('should return "Normal" for normal pitch', () => {
      expect(getPitchDescription(1.0)).toBe('Normal');
    });

    it('should return "Agudo" for high pitch', () => {
      expect(getPitchDescription(1.15)).toBe('Agudo');
    });

    it('should return "Muito Agudo" for very high pitch', () => {
      expect(getPitchDescription(1.5)).toBe('Muito Agudo');
    });
  });

  describe('validateSpeechSettings', () => {
    it('should validate correct settings', () => {
      const valid = validateSpeechSettings(DEFAULT_SPEECH_SETTINGS);
      expect(valid).toBe(true);
    });

    it('should reject invalid rate (too low)', () => {
      const invalid = validateSpeechSettings({ rate: 0.3 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid rate (too high)', () => {
      const invalid = validateSpeechSettings({ rate: 2.5 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid pitch (too low)', () => {
      const invalid = validateSpeechSettings({ pitch: 0.3 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid pitch (too high)', () => {
      const invalid = validateSpeechSettings({ pitch: 2.5 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid volume (negative)', () => {
      const invalid = validateSpeechSettings({ volume: -0.1 });
      expect(invalid).toBe(false);
    });

    it('should reject invalid volume (too high)', () => {
      const invalid = validateSpeechSettings({ volume: 1.5 });
      expect(invalid).toBe(false);
    });

    it('should accept valid rate values', () => {
      expect(validateSpeechSettings({ rate: 0.5 })).toBe(true);
      expect(validateSpeechSettings({ rate: 1.0 })).toBe(true);
      expect(validateSpeechSettings({ rate: 2.0 })).toBe(true);
    });

    it('should accept valid pitch values', () => {
      expect(validateSpeechSettings({ pitch: 0.5 })).toBe(true);
      expect(validateSpeechSettings({ pitch: 1.0 })).toBe(true);
      expect(validateSpeechSettings({ pitch: 2.0 })).toBe(true);
    });

    it('should accept valid volume values', () => {
      expect(validateSpeechSettings({ volume: 0 })).toBe(true);
      expect(validateSpeechSettings({ volume: 0.5 })).toBe(true);
      expect(validateSpeechSettings({ volume: 1 })).toBe(true);
    });
  });
});
