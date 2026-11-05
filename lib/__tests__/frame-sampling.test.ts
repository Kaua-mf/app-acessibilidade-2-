import { describe, it, expect } from 'vitest';
import {
  SAMPLE_WIDTH,
  base64ToBytes,
  bytesToBase64,
  regionRadiusFromSetting,
} from '../frame-sampling';

describe('Frame Sampling', () => {
  describe('base64ToBytes', () => {
    it('should decode a known string', () => {
      const bytes = base64ToBytes('SGVsbG8=');
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]); // "Hello"
    });

    it('should decode without padding', () => {
      const bytes = base64ToBytes('SGVsbG8');
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
    });

    it('should ignore the data URL prefix', () => {
      const bytes = base64ToBytes('data:image/jpeg;base64,SGk=');
      expect(Array.from(bytes)).toEqual([72, 105]); // "Hi"
    });

    it('should ignore whitespace and line breaks', () => {
      const bytes = base64ToBytes('SGVs\nbG8=  ');
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
    });

    it('should return an empty array for an empty string', () => {
      expect(base64ToBytes('')).toHaveLength(0);
    });

    it('should match Node Buffer for all byte values', () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) original[i] = i;
      const encoded = Buffer.from(original).toString('base64');
      expect(Array.from(base64ToBytes(encoded))).toEqual(Array.from(original));
    });
  });

  describe('bytesToBase64', () => {
    it('should match Node Buffer for lengths 0 to 10', () => {
      for (let length = 0; length <= 10; length++) {
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) bytes[i] = (i * 37 + 11) & 255;
        expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
      }
    });

    it('should round trip with base64ToBytes', () => {
      const original = new Uint8Array(1000);
      for (let i = 0; i < original.length; i++) original[i] = (i * 131 + 7) & 255;
      const roundTrip = base64ToBytes(bytesToBase64(original));
      expect(Array.from(roundTrip)).toEqual(Array.from(original));
    });
  });

  describe('regionRadiusFromSetting', () => {
    it('should use the percentage of the shorter side', () => {
      // Padrão 20% de 48 px = ~10 px de raio
      expect(regionRadiusFromSetting(20, SAMPLE_WIDTH, 48)).toBe(10);
    });

    it('should use the shorter side for portrait images', () => {
      expect(regionRadiusFromSetting(20, 64, 85)).toBe(13);
    });

    it('should grow with the setting', () => {
      const small = regionRadiusFromSetting(10, 64, 48);
      const large = regionRadiusFromSetting(40, 64, 48);
      expect(large).toBeGreaterThan(small);
    });

    it('should clamp settings outside 5-50', () => {
      expect(regionRadiusFromSetting(0, 64, 48)).toBe(regionRadiusFromSetting(5, 64, 48));
      expect(regionRadiusFromSetting(500, 64, 48)).toBe(regionRadiusFromSetting(50, 64, 48));
    });

    it('should never return less than 1 pixel', () => {
      expect(regionRadiusFromSetting(5, 8, 8)).toBeGreaterThanOrEqual(1);
    });
  });
});
