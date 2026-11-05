import { describe, it, expect } from 'vitest';
import {
  createLightSmoother,
  estimateLight,
  evToPercentage,
  exposureEv100,
  lightnessFromLuminance,
  meanLinearLuminance,
  parseExposureInfo,
} from '../light-analysis';

function solidImage(r: number, g: number, b: number, pixels = 16, alpha = 255): Uint8ClampedArray {
  const data = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = alpha;
  }
  return data;
}

describe('Light Analysis', () => {
  describe('meanLinearLuminance', () => {
    it('should be 1 for a white image', () => {
      expect(meanLinearLuminance(solidImage(255, 255, 255))).toBeCloseTo(1, 3);
    });

    it('should be 0 for a black image', () => {
      expect(meanLinearLuminance(solidImage(0, 0, 0))).toBe(0);
    });

    it('should decode sRGB gamma (mid gray 128 is about 0.216, not 0.5)', () => {
      expect(meanLinearLuminance(solidImage(128, 128, 128))).toBeCloseTo(0.2158, 3);
    });

    it('should weight green more than red and blue', () => {
      const red = meanLinearLuminance(solidImage(255, 0, 0));
      const green = meanLinearLuminance(solidImage(0, 255, 0));
      const blue = meanLinearLuminance(solidImage(0, 0, 255));
      expect(green).toBeGreaterThan(red);
      expect(red).toBeGreaterThan(blue);
    });

    it('should average different pixels', () => {
      const data = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
      expect(meanLinearLuminance(data)).toBeCloseTo(0.5, 3);
    });

    it('should ignore transparent pixels', () => {
      const data = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0]);
      expect(meanLinearLuminance(data)).toBeCloseTo(1, 3);
    });

    it('should return 0 for empty data', () => {
      expect(meanLinearLuminance(new Uint8ClampedArray(0))).toBe(0);
    });
  });

  describe('lightnessFromLuminance', () => {
    it('should map 0 to 0 and 1 to 100', () => {
      expect(lightnessFromLuminance(0)).toBe(0);
      expect(lightnessFromLuminance(1)).toBeCloseTo(100, 3);
    });

    it('should map middle gray (0.18) to about 50', () => {
      const lightness = lightnessFromLuminance(0.18);
      expect(lightness).toBeGreaterThan(48);
      expect(lightness).toBeLessThan(51);
    });

    it('should increase with luminance', () => {
      let previous = -1;
      for (let y = 0; y <= 1; y += 0.05) {
        const value = lightnessFromLuminance(y);
        expect(value).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    });

    it('should clamp out of range input', () => {
      expect(lightnessFromLuminance(-1)).toBe(0);
      expect(lightnessFromLuminance(5)).toBeCloseTo(100, 3);
    });
  });

  describe('evToPercentage', () => {
    it('should map EV 0 to 0% and EV 15 to 100%', () => {
      expect(evToPercentage(0)).toBe(0);
      expect(evToPercentage(15)).toBe(100);
    });

    it('should be linear in EV (logarithmic in light)', () => {
      expect(evToPercentage(7.5)).toBeCloseTo(50, 5);
    });

    it('should clamp values outside the range', () => {
      expect(evToPercentage(-5)).toBe(0);
      expect(evToPercentage(20)).toBe(100);
    });
  });

  describe('parseExposureInfo', () => {
    it('should read flat EXIF (Android style)', () => {
      const info = parseExposureInfo({ ExposureTime: 0.01, ISOSpeedRatings: 200, FNumber: 1.8 });
      expect(info.exposureTime).toBe(0.01);
      expect(info.iso).toBe(200);
      expect(info.fNumber).toBe(1.8);
    });

    it('should read nested {Exif} with arrays (iOS style)', () => {
      const info = parseExposureInfo({
        '{Exif}': { ExposureTime: 0.0333, ISOSpeedRatings: [80], FNumber: 1.6, BrightnessValue: 4.2 },
      });
      expect(info.exposureTime).toBe(0.0333);
      expect(info.iso).toBe(80);
      expect(info.fNumber).toBe(1.6);
      expect(info.brightnessValue).toBe(4.2);
    });

    it('should read fractions and numeric strings', () => {
      const info = parseExposureInfo({ ExposureTime: '1/30', ISOSpeedRatings: '400', FNumber: '2.2' });
      expect(info.exposureTime).toBeCloseTo(1 / 30, 6);
      expect(info.iso).toBe(400);
      expect(info.fNumber).toBe(2.2);
    });

    it('should derive the f-number from ApertureValue when FNumber is missing', () => {
      const info = parseExposureInfo({ ApertureValue: 2 }); // 2^(2/2) = 2
      expect(info.fNumber).toBeCloseTo(2, 6);
    });

    it('should return an empty object for missing or invalid EXIF', () => {
      expect(parseExposureInfo(undefined)).toEqual({});
      expect(parseExposureInfo(null)).toEqual({});
      expect(parseExposureInfo('texto')).toEqual({});
    });

    it('should drop non-positive and non-numeric values', () => {
      const info = parseExposureInfo({ ExposureTime: 0, ISOSpeedRatings: 'abc', FNumber: -1 });
      expect(info.exposureTime).toBeUndefined();
      expect(info.iso).toBeUndefined();
      expect(info.fNumber).toBeUndefined();
    });
  });

  describe('exposureEv100', () => {
    it('should give EV 15 for f/16, 1/125 s, ISO 100 (sunny 16 rule)', () => {
      expect(exposureEv100(1 / 125, 100, 16)).toBeCloseTo(14.97, 1);
    });

    it('should drop by 1 EV when ISO doubles', () => {
      const base = exposureEv100(1 / 60, 100, 2);
      const doubled = exposureEv100(1 / 60, 200, 2);
      expect(base - doubled).toBeCloseTo(1, 6);
    });
  });

  describe('estimateLight', () => {
    // A câmera compensa a exposição sozinha, então a foto sempre fica com brilho médio parecido
    const autoExposedLuminance = 0.18;

    it('should tell a bright scene from a dim one even when the pixels look the same', () => {
      const bright = estimateLight(autoExposedLuminance, {
        ExposureTime: 1 / 1000,
        ISOSpeedRatings: 50,
        FNumber: 1.8,
      });
      const dim = estimateLight(autoExposedLuminance, {
        ExposureTime: 1 / 15,
        ISOSpeedRatings: 800,
        FNumber: 1.8,
      });
      expect(bright.source).toBe('exif-exposure');
      expect(bright.percentage).toBeGreaterThan(dim.percentage + 40);
    });

    it('should use BrightnessValue when available (EV100 = Bv + 5)', () => {
      const estimate = estimateLight(0.5, { '{Exif}': { BrightnessValue: 5 } });
      expect(estimate.source).toBe('exif-brightness');
      expect(estimate.ev).toBe(10);
      expect(estimate.percentage).toBe(67);
    });

    it('should raise the estimate when pixels are brighter than middle gray', () => {
      const exif = { ExposureTime: 1 / 60, ISOSpeedRatings: 100, FNumber: 2 };
      const normal = estimateLight(0.18, exif);
      const brighter = estimateLight(0.72, exif); // +2 EV
      expect(brighter.ev! - normal.ev!).toBeCloseTo(2, 5);
    });

    it('should limit the pixel correction to 4 EV', () => {
      const exif = { ExposureTime: 1 / 60, ISOSpeedRatings: 100, FNumber: 2 };
      const noise = estimateLight(0.0000001, exif);
      const base = estimateLight(0.18, exif);
      expect(base.ev! - noise.ev!).toBeCloseTo(4, 5);
    });

    it('should fall back to pixel lightness without EXIF', () => {
      const dark = estimateLight(0.001);
      const bright = estimateLight(0.8);
      expect(dark.source).toBe('pixels');
      expect(bright.percentage).toBeGreaterThan(dark.percentage);
    });

    it('should fall back to pixels when EXIF is incomplete', () => {
      const estimate = estimateLight(0.18, { ISOSpeedRatings: 100 });
      expect(estimate.source).toBe('pixels');
    });

    it('should return 0% for black and 100% for white without EXIF', () => {
      expect(estimateLight(0).percentage).toBe(0);
      expect(estimateLight(1).percentage).toBe(100);
    });

    it('should always stay between 0 and 100', () => {
      const extremes = [
        { ExposureTime: 1 / 8000, ISOSpeedRatings: 25, FNumber: 1.4 },
        { ExposureTime: 1, ISOSpeedRatings: 6400, FNumber: 2.8 },
        { BrightnessValue: -10 },
        { BrightnessValue: 30 },
      ];
      for (const exif of extremes) {
        const { percentage } = estimateLight(0.18, exif);
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('createLightSmoother', () => {
    it('should return the first value unchanged', () => {
      const smoother = createLightSmoother(0.5);
      expect(smoother.smooth(80)).toBe(80);
    });

    it('should move part of the way toward each new value', () => {
      const smoother = createLightSmoother(0.5);
      smoother.smooth(0);
      expect(smoother.smooth(100)).toBe(50);
      expect(smoother.smooth(100)).toBe(75);
    });

    it('should converge to a constant input', () => {
      const smoother = createLightSmoother(0.5);
      smoother.smooth(0);
      let value = 0;
      for (let i = 0; i < 20; i++) value = smoother.smooth(60);
      expect(value).toBeCloseTo(60, 3);
    });

    it('should forget history after reset', () => {
      const smoother = createLightSmoother(0.5);
      smoother.smooth(0);
      smoother.reset();
      expect(smoother.smooth(90)).toBe(90);
    });
  });
});
