import { describe, it, expect } from 'vitest';
import {
  UNCERTAIN_COLOR_NAME,
  createColorStabilizer,
  framesFromSensitivity,
  isConfidentEnough,
} from '../color-stabilizer';

describe('Color Stabilizer', () => {
  describe('framesFromSensitivity', () => {
    it('should confirm with 1 reading at sensitivity 70 or more', () => {
      expect(framesFromSensitivity(70)).toBe(1);
      expect(framesFromSensitivity(100)).toBe(1);
    });

    it('should confirm with 2 readings between 40 and 69', () => {
      expect(framesFromSensitivity(40)).toBe(2);
      expect(framesFromSensitivity(50)).toBe(2);
      expect(framesFromSensitivity(69)).toBe(2);
    });

    it('should confirm with 3 readings below 40', () => {
      expect(framesFromSensitivity(39)).toBe(3);
      expect(framesFromSensitivity(0)).toBe(3);
    });
  });

  describe('isConfidentEnough', () => {
    it('should accept confidence equal to or above the minimum', () => {
      expect(isConfidentEnough(70, 70)).toBe(true);
      expect(isConfidentEnough(95, 70)).toBe(true);
    });

    it('should reject confidence below the minimum', () => {
      expect(isConfidentEnough(69, 70)).toBe(false);
    });
  });

  describe('createColorStabilizer', () => {
    it('should confirm a color only after the required readings in a row', () => {
      const stabilizer = createColorStabilizer(2);
      expect(stabilizer.push('Verde')).toBeNull();
      expect(stabilizer.push('Verde')).toBe('Verde');
    });

    it('should confirm immediately when 1 reading is required', () => {
      const stabilizer = createColorStabilizer(1);
      expect(stabilizer.push('Azul')).toBe('Azul');
    });

    it('should not confirm an unstable color', () => {
      const stabilizer = createColorStabilizer(2);
      expect(stabilizer.push('Verde')).toBeNull();
      expect(stabilizer.push('Verde Claro')).toBeNull();
      expect(stabilizer.push('Verde')).toBeNull();
      expect(stabilizer.push('Verde Claro')).toBeNull();
    });

    it('should not announce the same color twice in a row', () => {
      const stabilizer = createColorStabilizer(2);
      stabilizer.push('Verde');
      expect(stabilizer.push('Verde')).toBe('Verde');
      expect(stabilizer.push('Verde')).toBeNull();
      expect(stabilizer.push('Verde')).toBeNull();
    });

    it('should announce a color again after a different one was confirmed', () => {
      const stabilizer = createColorStabilizer(2);
      stabilizer.push('Verde');
      stabilizer.push('Verde');
      stabilizer.push('Azul');
      expect(stabilizer.push('Azul')).toBe('Azul');
      stabilizer.push('Verde');
      expect(stabilizer.push('Verde')).toBe('Verde');
    });

    it('should not re-announce after a brief flicker to another color', () => {
      const stabilizer = createColorStabilizer(2);
      stabilizer.push('Verde');
      stabilizer.push('Verde');
      stabilizer.push('Azul'); // uma leitura isolada
      expect(stabilizer.push('Verde')).toBeNull();
    });

    it('should handle the uncertain state like any other name', () => {
      const stabilizer = createColorStabilizer(2);
      stabilizer.push(UNCERTAIN_COLOR_NAME);
      expect(stabilizer.push(UNCERTAIN_COLOR_NAME)).toBe(UNCERTAIN_COLOR_NAME);
    });

    it('should allow changing the required readings', () => {
      const stabilizer = createColorStabilizer(3);
      stabilizer.setRequiredFrames(1);
      expect(stabilizer.push('Roxo')).toBe('Roxo');
    });

    it('should announce the same color again after reset', () => {
      const stabilizer = createColorStabilizer(1);
      expect(stabilizer.push('Verde')).toBe('Verde');
      stabilizer.reset();
      expect(stabilizer.push('Verde')).toBe('Verde');
    });

    it('should treat invalid frame counts as 1', () => {
      const stabilizer = createColorStabilizer(0);
      expect(stabilizer.push('Verde')).toBe('Verde');
    });
  });
});
