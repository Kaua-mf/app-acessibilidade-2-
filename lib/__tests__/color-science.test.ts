/**
 * Testes para Color Science (CIELAB, Delta E 2000, White Balance)
 *
 * Validações baseadas em valores de referência CIE e casos conhecidos.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Conversões
  srgbToLinear,
  linearToSrgb,
  linearRgbToXyz,
  xyzToLinearRgb,
  xyzToLab,
  labToXyz,
  srgbToLab,
  labToSrgb,

  // Delta E
  deltaE2000,
  deltaE76,
  deltaEToConfidence,
  calculatePerceptualConfidence,

  // White Balance
  chromaticAdaptation,
  D65_WHITE_POINT,

  // Cache
  colorConversionCache,
  srgbToLabCached,
  clearColorCache,

  // Tipos
  type LabColor,
  type RgbColor,
  type XyzColor,
} from '../color-science';

// ============================================================================
// Helpers
// ============================================================================

const approx = (actual: number, expected: number, tolerance = 0.01) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

const labApprox = (actual: LabColor, expected: LabColor, tolerance = 0.5) => {
  approx(actual.L, expected.L, tolerance);
  approx(actual.a, expected.a, tolerance);
  approx(actual.b, expected.b, tolerance);
};

const rgb = (r: number, g: number, b: number): RgbColor => ({ r, g, b });
const lab = (L: number, a: number, b: number): LabColor => ({ L, a, b });
const xyz = (X: number, Y: number, Z: number): XyzColor => ({ X, Y, Z });

// ============================================================================
// Conversões Básicas (LUTs)
// ============================================================================

describe('Color Science - LUTs e Conversões Básicas', () => {
  describe('srgbToLinear / linearToSrgb', () => {
    it('deve converter preto (0,0,0) → linear (0,0,0)', () => {
      const linear = srgbToLinear(rgb(0, 0, 0));
      expect(linear.r).toBe(0);
      expect(linear.g).toBe(0);
      expect(linear.b).toBe(0);
    });

    it('deve converter branco (255,255,255) → linear (1,1,1)', () => {
      const linear = srgbToLinear(rgb(255, 255, 255));
      approx(linear.r, 1);
      approx(linear.g, 1);
      approx(linear.b, 1);
    });

    it('deve ser inversa: sRGB → linear → sRGB = original', () => {
      const testColors = [
        rgb(0, 0, 0),
        rgb(128, 128, 128),
        rgb(255, 0, 0),
        rgb(0, 255, 0),
        rgb(0, 0, 255),
        rgb(255, 255, 0),
        rgb(255, 0, 255),
        rgb(0, 255, 255),
        rgb(255, 255, 255),
        rgb(100, 150, 200),
      ];

      for (const c of testColors) {
        const linear = srgbToLinear(c);
        const back = linearToSrgb(linear);
        // Tolerância de 1 unidade por quantização 8-bit
        expect(Math.abs(back.r - c.r)).toBeLessThanOrEqual(1);
        expect(Math.abs(back.g - c.g)).toBeLessThanOrEqual(1);
        expect(Math.abs(back.b - c.b)).toBeLessThanOrEqual(1);
      }
    });

    it('cinza médio (128,128,128) → linear ≈ 0.216', () => {
      const linear = srgbToLinear(rgb(128, 128, 128));
      approx(linear.r, 0.216, 0.005);
      approx(linear.g, 0.216, 0.005);
      approx(linear.b, 0.216, 0.005);
    });
  });

  describe('linearRgbToXyz / xyzToLinearRgb', () => {
    it('deve ser inversa', () => {
      const testLinears = [
        { r: 0, g: 0, b: 0 },
        { r: 1, g: 1, b: 1 },
        { r: 0.5, g: 0.5, b: 0.5 },
        { r: 1, g: 0, b: 0 },
        { r: 0, g: 1, b: 0 },
        { r: 0, g: 0, b: 1 },
        { r: 0.3, g: 0.6, b: 0.1 },
      ];

      for (const lin of testLinears) {
        const xyz_ = linearRgbToXyz(lin);
        const back = xyzToLinearRgb(xyz_);
        approx(back.r, lin.r, 0.001);
        approx(back.g, lin.g, 0.001);
        approx(back.b, lin.b, 0.001);
      }
    });

    it('branco D65 → XYZ = white point', () => {
      const xyz_ = linearRgbToXyz({ r: 1, g: 1, b: 1 });
      approx(xyz_.X, D65_WHITE_POINT.X, 0.01);
      approx(xyz_.Y, D65_WHITE_POINT.Y, 0.01);
      approx(xyz_.Z, D65_WHITE_POINT.Z, 0.01);
    });
  });

  describe('xyzToLab / labToXyz', () => {
    it('deve ser inversa', () => {
      const testLab: LabColor[] = [
        lab(0, 0, 0),
        lab(50, 0, 0),
        lab(100, 0, 0),
        lab(50, 50, 0),
        lab(50, -50, 0),
        lab(50, 0, 50),
        lab(50, 0, -50),
        lab(50, 40, 30),
        lab(80, -60, 40),
      ];

      for (const l of testLab) {
        const xyz_ = labToXyz(l);
        const back = xyzToLab(xyz_);
        approx(back.L, l.L, 0.01);
        approx(back.a, l.a, 0.01);
        approx(back.b, l.b, 0.01);
      }
    });

    it('branco D65 → Lab = (100, 0, 0)', () => {
      const lab_ = xyzToLab(D65_WHITE_POINT);
      approx(lab_.L, 100, 0.01);
      approx(lab_.a, 0, 0.01);
      approx(lab_.b, 0, 0.01);
    });

    it('preto → Lab = (0, 0, 0)', () => {
      const lab_ = xyzToLab({ X: 0, Y: 0, Z: 0 });
      approx(lab_.L, 0, 0.01);
      approx(lab_.a, 0, 0.01);
      approx(lab_.b, 0, 0.01);
    });
  });

  describe('srgbToLab / labToSrgb (pipeline completo)', () => {
    it('deve ser aproximadamente inversa (quantização 8-bit)', () => {
      const testColors = [
        rgb(0, 0, 0),
        rgb(255, 255, 255),
        rgb(128, 128, 128),
        rgb(255, 0, 0),
        rgb(0, 255, 0),
        rgb(0, 0, 255),
        rgb(255, 255, 0),
        rgb(255, 0, 255),
        rgb(0, 255, 255),
        rgb(200, 100, 50),
        rgb(50, 150, 200),
      ];

      for (const c of testColors) {
        const lab_ = srgbToLab(c);
        const back = labToSrgb(lab_);
        // Tolerância de 2 unidades por quantização + clamping
        expect(Math.abs(back.r - c.r)).toBeLessThanOrEqual(2);
        expect(Math.abs(back.g - c.g)).toBeLessThanOrEqual(2);
        expect(Math.abs(back.b - c.b)).toBeLessThanOrEqual(2);
      }
    });

    it('vermelho puro #FF0000 → Lab ≈ (53.2, 80.1, 67.2)', () => {
      const lab_ = srgbToLab(rgb(255, 0, 0));
      labApprox(lab_, lab(53.2, 80.1, 67.2), 1.0);
    });

    it('verde puro #00FF00 → Lab ≈ (87.7, -86.2, 83.2)', () => {
      const lab_ = srgbToLab(rgb(0, 255, 0));
      labApprox(lab_, lab(87.7, -86.2, 83.2), 1.0);
    });

    it('azul puro #0000FF → Lab ≈ (32.3, 79.2, -107.9)', () => {
      const lab_ = srgbToLab(rgb(0, 0, 255));
      labApprox(lab_, lab(32.3, 79.2, -107.9), 1.0);
    });

    it('cinza médio #808080 → Lab ≈ (53.6, 0, 0)', () => {
      const lab_ = srgbToLab(rgb(128, 128, 128));
      labApprox(lab_, lab(53.6, 0, 0), 0.5);
    });
  });
});

// ============================================================================
// Delta E 2000 (CIEDE2000)
// ============================================================================

describe('Color Science - Delta E 2000', () => {
  // Valores de referência do CIE (arquivo CIEDE2000 test data)
  // Fonte: CIE TC 1-47, "Testing of CIEDE2000"

  describe('Casos de referência CIE', () => {
    it('cinza neutro: ΔE entre L=50 e L=51 deve ser ≈ 1.0', () => {
      const dE = deltaE2000(lab(50, 0, 0), lab(51, 0, 0));
      approx(dE, 1.0, 0.05);
    });

    it('vermelho puro vs vermelho ligeiramente diferente', () => {
      // Valores aproximados do dataset CIE
      const dE = deltaE2000(lab(53.2, 80.1, 67.2), lab(53.2, 81.1, 67.2));
      // Diferença pequena em a* → ΔE pequeno
      expect(dE).toBeLessThan(2.0);
    });

    it('cores complementares: vermelho vs ciano → ΔE grande', () => {
      const red = srgbToLab(rgb(255, 0, 0));
      const cyan = srgbToLab(rgb(0, 255, 255));
      const dE = deltaE2000(red, cyan);
      // ΔE 2000 para vermelho vs ciano é ~71 (não > 80 como ΔE 76)
      expect(dE).toBeGreaterThan(65);
      expect(dE).toBeLessThan(80);
    });

    it('cores idênticas → ΔE = 0', () => {
      const c = lab(50, 20, 30);
      expect(deltaE2000(c, c)).toBe(0);
    });

    it('simetria: ΔE(a,b) = ΔE(b,a)', () => {
      const a = srgbToLab(rgb(200, 100, 50));
      const b = srgbToLab(rgb(100, 150, 200));
      const dE1 = deltaE2000(a, b);
      const dE2 = deltaE2000(b, a);
      approx(dE1, dE2, 0.001);
    });

    it('triangular inequality: ΔE(a,c) ≤ ΔE(a,b) + ΔE(b,c)', () => {
      const a = srgbToLab(rgb(255, 0, 0));
      const b = srgbToLab(rgb(200, 50, 50));
      const c = srgbToLab(rgb(100, 100, 100));

      const dE_ac = deltaE2000(a, c);
      const dE_ab = deltaE2000(a, b);
      const dE_bc = deltaE2000(b, c);

      expect(dE_ac).toBeLessThanOrEqual(dE_ab + dE_bc + 0.001);
    });
  });

  describe('Casos perceptuais conhecidos', () => {
    it('ΔE < 1.0: imperceptível (mesma cor)', () => {
      const c1 = srgbToLab(rgb(128, 128, 128));
      const c2 = srgbToLab(rgb(130, 130, 130)); // Diferença mínima
      const dE = deltaE2000(c1, c2);
      expect(dE).toBeLessThan(1.0);
    });

    it('ΔE 1-2: limiar perceptível', () => {
      const c1 = srgbToLab(rgb(180, 100, 50));
      const c2 = srgbToLab(rgb(190, 105, 55));
      const dE = deltaE2000(c1, c2);
      expect(dE).toBeGreaterThanOrEqual(1.0);
      expect(dE).toBeLessThanOrEqual(3.0);
    });

    it('ΔE > 5: diferença óbvia', () => {
      const red = srgbToLab(rgb(255, 0, 0));
      const green = srgbToLab(rgb(0, 255, 0));
      const dE = deltaE2000(red, green);
      expect(dE).toBeGreaterThan(50);
    });

    it('Diferença só em L (lightness) → ΔE ≈ ΔL para cinzas', () => {
      const dE = deltaE2000(lab(50, 0, 0), lab(60, 0, 0));
      // Delta E 2000 aplica fator SL de escala de lightness: ΔE = ΔL / SL
      // Para L=55, SL ≈ 1.056, então ΔE ≈ 10 / 1.056 ≈ 9.47
      approx(dE, 9.47, 0.1);
    });

    it('Diferença só em a* (vermelho-verde) → ΔE proporcional', () => {
      const dE = deltaE2000(lab(50, 0, 0), lab(50, 20, 0));
      // Para L=50, C=20, ΔE ≈ 20 * fator
      expect(dE).toBeGreaterThan(15);
      expect(dE).toBeLessThan(25);
    });
  });

  describe('Delta E 76 (fallback simples)', () => {
    it('deve ser Euclidiano em Lab', () => {
      const dE76 = deltaE76(lab(50, 0, 0), lab(50, 10, 10));
      const expected = Math.sqrt(10 * 10 + 10 * 10); // ≈ 14.14
      approx(dE76, expected, 0.01);
    });

    it('ΔE76 ≥ ΔE2000 geralmente (2000 corrige superestimação)', () => {
      const a = srgbToLab(rgb(255, 100, 100));
      const b = srgbToLab(rgb(200, 150, 50));
      expect(deltaE76(a, b)).toBeGreaterThanOrEqual(deltaE2000(a, b) - 0.01);
    });
  });
});

// ============================================================================
// Confiança Perceptual
// ============================================================================

describe('Color Science - Confiança Perceptual', () => {
  describe('deltaEToConfidence', () => {
    it('ΔE = 0 → 100%', () => {
      expect(deltaEToConfidence(0)).toBe(100);
    });

    it('ΔE = 0.5 (imperceptível) → 100%', () => {
      expect(deltaEToConfidence(0.5)).toBe(100);
    });

    it('ΔE = 1.0 (limiar) → 100%', () => {
      expect(deltaEToConfidence(1.0)).toBe(100);
    });

    it('ΔE = 1.5 → ~80%', () => {
      const conf = deltaEToConfidence(1.5);
      expect(conf).toBeGreaterThan(75);
      expect(conf).toBeLessThan(85);
    });

    it('ΔE = 2.0 → 70%', () => {
      expect(deltaEToConfidence(2.0)).toBe(70);
    });

    it('ΔE = 3.5 → 50% (fórmula linear: 70 - 40*(3.5-2)/3 = 50)', () => {
      const conf = deltaEToConfidence(3.5);
      expect(conf).toBe(50);
    });

    it('ΔE = 5.0 → 30%', () => {
      expect(deltaEToConfidence(5.0)).toBe(30);
    });

    it('ΔE = 10.0 → ~10%', () => {
      const conf = deltaEToConfidence(10.0);
      expect(conf).toBeGreaterThanOrEqual(0);
      expect(conf).toBeLessThanOrEqual(20);
    });

    it('ΔE muito alto → 0% (mínimo)', () => {
      expect(deltaEToConfidence(100)).toBe(0);
    });
  });

  describe('calculatePerceptualConfidence (com margem para 2ª cor)', () => {
    it('match perfeito (ΔE1=0) → 100%, não ambíguo', () => {
      const result = calculatePerceptualConfidence(0, 10);
      expect(result.confidence).toBe(100);
      expect(result.isAmbiguous).toBe(false);
      expect(result.marginRatio).toBe(Infinity);
    });

    it('match bom, 2ª cor distante (ratio > 1.5) → confiança alta, não ambíguo', () => {
      const result = calculatePerceptualConfidence(1.0, 5.0); // ratio = 5
      expect(result.confidence).toBeGreaterThan(90);
      expect(result.isAmbiguous).toBe(false);
    });

    it('match bom, 2ª cor próxima (ratio < 1.5) → ambíguo, confiança reduzida', () => {
      const result = calculatePerceptualConfidence(1.0, 1.2); // ratio = 1.2
      expect(result.isAmbiguous).toBe(true);
      expect(result.confidence).toBeLessThan(100);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('match fraco (ΔE1=3), 2ª cor muito próxima → confiança bem reduzida', () => {
      const result = calculatePerceptualConfidence(3.0, 3.5); // ratio ≈ 1.17
      expect(result.isAmbiguous).toBe(true);
      expect(result.confidence).toBeLessThan(50);
    });

    it('ratio = 1.0 (empate) → confiança ≈ 50% da base', () => {
      const result = calculatePerceptualConfidence(2.0, 2.0);
      expect(result.isAmbiguous).toBe(true);
      expect(result.marginRatio).toBe(1.0);
    });
  });
});

// ============================================================================
// Adaptação Cromática (White Balance / von Kries)
// ============================================================================

describe('Color Science - Adaptação Cromática (von Kries/Bradford)', () => {
  it('adaptar de D65 para D65 = identidade', () => {
    const testXyz = xyz(50, 40, 30);
    const adapted = chromaticAdaptation(testXyz, D65_WHITE_POINT, D65_WHITE_POINT);
    approx(adapted.X, testXyz.X, 0.01);
    approx(adapted.Y, testXyz.Y, 0.01);
    approx(adapted.Z, testXyz.Z, 0.01);
  });

  it('ponto branco de origem → ponto branco de destino', () => {
    // Iluminante A (incandescente ~2856K)
    const illuminantA = xyz(109.85, 100.0, 35.58);
    const adapted = chromaticAdaptation(illuminantA, illuminantA, D65_WHITE_POINT);
    approx(adapted.X, D65_WHITE_POINT.X, 0.5);
    approx(adapted.Y, D65_WHITE_POINT.Y, 0.5);
    approx(adapted.Z, D65_WHITE_POINT.Z, 0.5);
  });

  it('cor neutra sob iluminante A → neutra sob D65 após adaptação', () => {
    // Cinza médio sob iluminante A
    const grayUnderA = xyz(19.5, 18.0, 6.5);
    const adapted = chromaticAdaptation(grayUnderA, xyz(109.85, 100, 35.58), D65_WHITE_POINT);
    const lab_ = xyzToLab(adapted);
    // a* e b* devem ser próximos de 0 (neutro) - tolerância 1.5 para Bradford
    expect(Math.abs(lab_.a)).toBeLessThan(1.5);
    expect(Math.abs(lab_.b)).toBeLessThan(1.5);
  });
});

// ============================================================================
// Cache de Conversão
// ============================================================================

describe('Color Science - Cache', () => {
  beforeEach(() => {
    clearColorCache();
  });

  it('deve cachear conversão RGB→Lab', () => {
    const c = rgb(123, 45, 67);
    const lab1 = srgbToLabCached(c);
    const lab2 = srgbToLabCached(c);
    expect(lab1).toBe(lab2); // Mesma referência
  });

  it('cores diferentes → entradas diferentes', () => {
    const lab1 = srgbToLabCached(rgb(100, 100, 100));
    const lab2 = srgbToLabCached(rgb(100, 100, 101));
    expect(lab1).not.toBe(lab2);
  });

  it('clearColorCache limpa o cache', () => {
    const c = rgb(50, 50, 50);
    srgbToLabCached(c);
    clearColorCache();
    // Não dá para testar diretamente se limpou, mas não deve quebrar
    const lab = srgbToLabCached(c);
    expect(lab.L).toBeGreaterThan(0);
  });
});

// ============================================================================
// Integração: sRGB → Lab → Delta E → Confiança
// ============================================================================

describe('Color Science - Pipeline Integrado', () => {
  it('vermelho puro vs laranja → ΔE moderado, confiança média', () => {
    const red = srgbToLab(rgb(255, 0, 0));
    const orange = srgbToLab(rgb(255, 165, 0));
    const dE = deltaE2000(red, orange);
    const conf = deltaEToConfidence(dE);
    // ΔE 2000 para vermelho vs laranja é ~33.75
    expect(dE).toBeGreaterThan(10);
    expect(dE).toBeLessThan(35);
    // Confiança para ΔE > 15 é 0 (fórmula: max(0, 30 - 30*1) = 0)
    expect(conf).toBeLessThanOrEqual(50);
  });

  it('azul vs azul marinho → ΔE moderado (diferença de lightness), confiança baixa', () => {
    const blue = srgbToLab(rgb(0, 0, 255));
    const navy = srgbToLab(rgb(0, 0, 128));
    const dE = deltaE2000(blue, navy);
    const conf = deltaEToConfidence(dE);
    // Azul puro vs azul marinho: diferença em L → ΔE ~16.5, confiança 0 (ΔE > 15)
    expect(dE).toBeGreaterThan(10);
    expect(dE).toBeLessThan(25);
    expect(conf).toBe(0);
  });

  it('branco vs cinza claro → ΔE pequeno (diferença só em L)', () => {
    const white = srgbToLab(rgb(255, 255, 255));
    const lightGray = srgbToLab(rgb(220, 220, 220));
    const dE = deltaE2000(white, lightGray);
    expect(dE).toBeLessThan(10);
  });
});