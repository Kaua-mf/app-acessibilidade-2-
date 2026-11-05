/**
 * Color Science Utilities
 *
 * Funções puras para ciência da cor: conversões RGB↔XYZ↔Lab,
 * Delta E 2000 (CIEDE2000), correção von Kries (white balance),
 * e Lookup Tables para performance.
 *
 * Referências:
 * - CIE 15:2004 / ISO 11664-4 (CIELAB)
 * - CIE TC 1-47 (CIEDE2000)
 * - Fairchild, "Color Appearance Models" 3rd ed. (von Kries)
 */

// ============================================================================
// Constantes e Tipos
// ============================================================================

/** Iluminante de referência D65 (luz do dia padrão) */
export const D65_WHITE_POINT = { X: 95.047, Y: 100.0, Z: 108.883 } as const;

/** Matriz sRGB → XYZ (D65) - IEC 61966-2-1:1999 */
export const SRGB_TO_XYZ_MATRIX = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
] as const;

/** Matriz XYZ → sRGB (D65) - inversa da acima */
export const XYZ_TO_SRGB_MATRIX = [
  [ 3.2404542, -1.5371385, -0.4985314],
  [-0.9692660,  1.8760108,  0.0415560],
  [ 0.0556434, -0.2040259,  1.0572252],
] as const;

/** Limiar para função f(t) do CIELAB (δ = 6/29) */
const LAB_DELTA = 6 / 29;
const LAB_DELTA_SQ = LAB_DELTA * LAB_DELTA;
const LAB_DELTA_CU = LAB_DELTA * LAB_DELTA * LAB_DELTA;
const LAB_KAPPA = 29 * 29 * 29 / 27 * 27; // (29/3)^3 = 24389/27 ≈ 903.3
const LAB_EPSILON = 216 / 24389; // (6/29)^3

export interface LabColor {
  L: number; // 0-100
  a: number; // ~ -128 a +128
  b: number; // ~ -128 a +128
}

export interface XyzColor {
  X: number;
  Y: number;
  Z: number;
}

export interface RgbColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

// ============================================================================
// Tabelas de Conversão (Pre-computadas para Performance)
// ============================================================================

/** sRGB (0-255) → Linear (0-1) - lookup table */
export const SRGB_TO_LINEAR_LUT: Float32Array = (() => {
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    table[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return table;
})();

/** Linear (0-1) → sRGB (0-255) - lookup table */
export const LINEAR_TO_SRGB_LUT: Uint8Array = (() => {
  const table = new Uint8Array(1001); // 0.000 a 1.000 em passos de 0.001
  for (let i = 0; i <= 1000; i++) {
    const c = i / 1000;
    const srgb = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    table[i] = Math.max(0, Math.min(255, Math.round(srgb * 255)));
  }
  return table;
})();

/** Lab L* (0-100) → f(t) para Delta E - lookup table */
export const LAB_F_LUT: Float32Array = (() => {
  const table = new Float32Array(10001); // 0.00 a 100.00
  for (let i = 0; i <= 10000; i++) {
    const t = i / 100;
    table[i] = t > LAB_EPSILON ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116;
  }
  return table;
})();

/** f(t) inverso para L* - lookup table */
export const LAB_F_INV_LUT: Float32Array = (() => {
  const table = new Float32Array(11601); // 0.00 a 116.00 (f(t) max ≈ 4.64, L* max=100)
  for (let i = 0; i <= 11600; i++) {
    const ft = i / 100;
    table[i] = ft > LAB_DELTA ? ft * ft * ft : (116 * ft - 16) / LAB_KAPPA;
  }
  return table;
})();

// ============================================================================
// Conversões Básicas (Otimizadas com LUTs)
// ============================================================================

/** sRGB (0-255) → Linear RGB (0-1) */
export function srgbToLinear(rgb: RgbColor): { r: number; g: number; b: number } {
  return {
    r: SRGB_TO_LINEAR_LUT[rgb.r],
    g: SRGB_TO_LINEAR_LUT[rgb.g],
    b: SRGB_TO_LINEAR_LUT[rgb.b],
  };
}

/** Linear RGB (0-1) → sRGB (0-255) */
export function linearToSrgb(linear: { r: number; g: number; b: number }): RgbColor {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const idx = (v: number) => Math.round(clamp(v) * 1000);
  return {
    r: LINEAR_TO_SRGB_LUT[idx(linear.r)],
    g: LINEAR_TO_SRGB_LUT[idx(linear.g)],
    b: LINEAR_TO_SRGB_LUT[idx(linear.b)],
  };
}

/** Linear RGB (0-1) → XYZ (D65) - returns XYZ in 0-100 scale */
export function linearRgbToXyz(linear: { r: number; g: number; b: number }): XyzColor {
  const { r, g, b } = linear;
  return {
    X: 100 * (r * SRGB_TO_XYZ_MATRIX[0][0] + g * SRGB_TO_XYZ_MATRIX[0][1] + b * SRGB_TO_XYZ_MATRIX[0][2]),
    Y: 100 * (r * SRGB_TO_XYZ_MATRIX[1][0] + g * SRGB_TO_XYZ_MATRIX[1][1] + b * SRGB_TO_XYZ_MATRIX[1][2]),
    Z: 100 * (r * SRGB_TO_XYZ_MATRIX[2][0] + g * SRGB_TO_XYZ_MATRIX[2][1] + b * SRGB_TO_XYZ_MATRIX[2][2]),
  };
}

/** XYZ (D65, 0-100 scale) → Linear RGB (0-1) */
export function xyzToLinearRgb(xyz: XyzColor): { r: number; g: number; b: number } {
  const { X, Y, Z } = xyz;
  const x = X / 100;
  const y = Y / 100;
  const z = Z / 100;
  return {
    r: x * XYZ_TO_SRGB_MATRIX[0][0] + y * XYZ_TO_SRGB_MATRIX[0][1] + z * XYZ_TO_SRGB_MATRIX[0][2],
    g: x * XYZ_TO_SRGB_MATRIX[1][0] + y * XYZ_TO_SRGB_MATRIX[1][1] + z * XYZ_TO_SRGB_MATRIX[1][2],
    b: x * XYZ_TO_SRGB_MATRIX[2][0] + y * XYZ_TO_SRGB_MATRIX[2][1] + z * XYZ_TO_SRGB_MATRIX[2][2],
  };
}

/** XYZ → CIELAB (D65) */
export function xyzToLab(xyz: XyzColor): LabColor {
  const { X, Y, Z } = xyz;
  const Xn = D65_WHITE_POINT.X;
  const Yn = D65_WHITE_POINT.Y;
  const Zn = D65_WHITE_POINT.Z;

  const xr = X / Xn;
  const yr = Y / Yn;
  const zr = Z / Zn;

  // Usar LUT para f(t)
  const fx = xr > LAB_EPSILON ? Math.cbrt(xr) : (LAB_KAPPA * xr + 16) / 116;
  const fy = yr > LAB_EPSILON ? Math.cbrt(yr) : (LAB_KAPPA * yr + 16) / 116;
  const fz = zr > LAB_EPSILON ? Math.cbrt(zr) : (LAB_KAPPA * zr + 16) / 116;

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { L: Math.max(0, Math.min(100, L)), a, b };
}

/** CIELAB → XYZ (D65) */
export function labToXyz(lab: LabColor): XyzColor {
  const { L, a, b } = lab;
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const xr = fx > LAB_DELTA ? fx * fx * fx : (116 * fx - 16) / LAB_KAPPA;
  const yr = fy > LAB_DELTA ? fy * fy * fy : (116 * fy - 16) / LAB_KAPPA;
  const zr = fz > LAB_DELTA ? fz * fz * fz : (116 * fz - 16) / LAB_KAPPA;

  return {
    X: xr * D65_WHITE_POINT.X,
    Y: yr * D65_WHITE_POINT.Y,
    Z: zr * D65_WHITE_POINT.Z,
  };
}

/** sRGB (0-255) → CIELAB (D65) - pipeline completo otimizado */
export function srgbToLab(rgb: RgbColor): LabColor {
  const linear = srgbToLinear(rgb);
  const xyz = linearRgbToXyz(linear);
  return xyzToLab(xyz);
}

/** CIELAB → sRGB (0-255) - pipeline completo otimizado */
export function labToSrgb(lab: LabColor): RgbColor {
  const xyz = labToXyz(lab);
  const linear = xyzToLinearRgb(xyz);
  return linearToSrgb(linear);
}

// ============================================================================
// Delta E 2000 (CIEDE2000) - Implementação Completa
// ============================================================================

/**
 * Calcula Delta E 2000 entre duas cores Lab
 *
 * Parâmetros padrão (kL=kC=kH=1) para uso geral.
 * Para aplicações têxteis: kL=2, kC=1, kH=1.
 *
 * Retorna ΔE₀₀: 0 = idênticas, <1 = imperceptível, 1-2 = limiar, >5 = diferença óbvia
 */
export function deltaE2000(
  lab1: LabColor,
  lab2: LabColor,
  kL = 1,
  kC = 1,
  kH = 1
): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  // 1. Diferença de Lightness
  const deltaL = L2 - L1;
  const Lmean = (L1 + L2) / 2;

  // 2. Chroma
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cmean = (C1 + C2) / 2;

  // 3. Fator de correção de chroma (G)
  const Cmean7 = Math.pow(Cmean, 7);
  const G = 0.5 * (1 - Math.sqrt(Cmean7 / (Cmean7 + Math.pow(25, 7))));

  // 4. Chroma corrigido
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const Cmeanp = (C1p + C2p) / 2;
  const deltaCp = C2p - C1p;

  // 5. Hue angle (em graus)
  const h1p = (C1p === 0) ? 0 : (Math.atan2(b1, a1p) * 180 / Math.PI + 360) % 360;
  const h2p = (C2p === 0) ? 0 : (Math.atan2(b2, a2p) * 180 / Math.PI + 360) % 360;

  // 6. Diferença de hue
  let deltahp = h2p - h1p;
  if (C1p * C2p === 0) {
    deltahp = 0;
  } else if (deltahp > 180) {
    deltahp -= 360;
  } else if (deltahp < -180) {
    deltahp += 360;
  }
  const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deltahp * Math.PI / 360);

  // 7. Hue médio
  let Hmeanp: number;
  if (C1p * C2p === 0) {
    Hmeanp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    Hmeanp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    Hmeanp = (h1p + h2p + 360) / 2;
  } else {
    Hmeanp = (h1p + h2p - 360) / 2;
  }

  // 8. Fator de rotação (T)
  const HmeanpRad = Hmeanp * Math.PI / 180;
  const T = 1
    - 0.17 * Math.cos(HmeanpRad - Math.PI / 6)
    + 0.24 * Math.cos(2 * HmeanpRad)
    + 0.32 * Math.cos(3 * HmeanpRad + Math.PI / 30)
    - 0.20 * Math.cos(4 * HmeanpRad - 63 * Math.PI / 180);

  // 9. Fatores de escala (SL, SC, SH)
  const deltaLPrime = deltaL / kL;
  const deltaCpPrime = deltaCp / kC;
  const deltaHpPrime = deltaHp / kH;

  const Lmean50 = Lmean - 50;
  const Lmean50sq = Lmean50 * Lmean50;

  const SL = 1 + (0.015 * Lmean50sq) / Math.sqrt(20 + Lmean50sq);
  const SC = 1 + 0.045 * Cmeanp;
  const SH = 1 + 0.015 * Cmeanp * T;

  // 10. Fator de rotação RT
  const deltaTheta = 30 * Math.exp(-Math.pow((Hmeanp - 275) / 25, 2));
  const Cmeanp7 = Math.pow(Cmeanp, 7);
  const RC = 2 * Math.sqrt(Cmeanp7 / (Cmeanp7 + Math.pow(25, 7)));
  const RT = -RC * Math.sin(2 * deltaTheta * Math.PI / 180);

  // 11. Delta E 2000 final
  const termL = deltaLPrime / SL;
  const termC = deltaCpPrime / SC;
  const termH = deltaHpPrime / SH;

  return Math.sqrt(
    termL * termL +
    termC * termC +
    termH * termH +
    RT * termC * termH
  );
}

/** Delta E 76 (CIE1976) - mais simples, para comparação/fallback */
export function deltaE76(lab1: LabColor, lab2: LabColor): number {
  const dL = lab2.L - lab1.L;
  const da = lab2.a - lab1.a;
  const db = lab2.b - lab1.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// ============================================================================
// Correção de Balanço de Branco (von Kries / Bradford)
// ============================================================================

/** Matriz Bradford para adaptação cromática (cone domain) */
const BRADFORD_MATRIX = [
  [ 0.8951,  0.2664, -0.1614],
  [-0.7502,  1.7135,  0.0367],
  [ 0.0389, -0.0685,  1.0296],
] as const;

const BRADFORD_INVERSE = [
  [ 0.9869929, -0.1470543,  0.1599627],
  [ 0.4323053,  0.5183603,  0.0492912],
  [-0.0085287,  0.0400428,  0.9684867],
] as const;

/**
 * Aplica adaptação cromática von Kries (Bradford)
 * Converte XYZ do iluminante de origem para iluminante de destino
 */
export function chromaticAdaptation(
  xyz: XyzColor,
  sourceWhite: XyzColor,
  targetWhite: XyzColor = D65_WHITE_POINT
): XyzColor {
  // Converter XYZ para cone domain (LMS) usando matriz Bradford
  const xyzToLms = (XYZ: XyzColor) => [
    BRADFORD_MATRIX[0][0] * XYZ.X + BRADFORD_MATRIX[0][1] * XYZ.Y + BRADFORD_MATRIX[0][2] * XYZ.Z,
    BRADFORD_MATRIX[1][0] * XYZ.X + BRADFORD_MATRIX[1][1] * XYZ.Y + BRADFORD_MATRIX[1][2] * XYZ.Z,
    BRADFORD_MATRIX[2][0] * XYZ.X + BRADFORD_MATRIX[2][1] * XYZ.Y + BRADFORD_MATRIX[2][2] * XYZ.Z,
  ];

  const colorLms = xyzToLms(xyz);
  const sourceWhiteLms = xyzToLms(sourceWhite);
  const targetWhiteLms = xyzToLms(targetWhite);

  // Fatores de escala von Kries (diagonal no cone domain)
  const scale = targetWhiteLms.map((t, i) => t / sourceWhiteLms[i]);

  // Aplicar escala ao LMS da cor
  const adaptedLms = colorLms.map((s, i) => s * scale[i]);

  // Converter de volta para XYZ usando matriz inversa Bradford
  return {
    X: BRADFORD_INVERSE[0][0] * adaptedLms[0] + BRADFORD_INVERSE[0][1] * adaptedLms[1] + BRADFORD_INVERSE[0][2] * adaptedLms[2],
    Y: BRADFORD_INVERSE[1][0] * adaptedLms[0] + BRADFORD_INVERSE[1][1] * adaptedLms[1] + BRADFORD_INVERSE[1][2] * adaptedLms[2],
    Z: BRADFORD_INVERSE[2][0] * adaptedLms[0] + BRADFORD_INVERSE[2][1] * adaptedLms[1] + BRADFORD_INVERSE[2][2] * adaptedLms[2],
  };
}

// ============================================================================
// Lookup Table para Delta E Rápido (Performance)
// ============================================================================

/**
 * Pré-calcula distâncias Delta E entre uma cor alvo e todas as cores da base
 * Útil quando a base de cores é fixa e fazemos muitas consultas
 */
export interface DeltaELutEntry {
  lab: LabColor;
  index: number;
}

export function buildDeltaELut(colorLabs: LabColor[]): DeltaELutEntry[] {
  return colorLabs.map((lab, index) => ({ lab, index }));
}

/**
 * Busca a cor mais próxima usando Delta E 2000 com early exit
 * Se encontra distância < threshold, para imediatamente
 */
export function findClosestDeltaE(
  targetLab: LabColor,
  lut: DeltaELutEntry[],
  threshold = 1.0
): { index: number; deltaE: number } {
  let bestIndex = 0;
  let bestDeltaE = Infinity;

  for (const entry of lut) {
    const dE = deltaE2000(targetLab, entry.lab);
    if (dE < bestDeltaE) {
      bestDeltaE = dE;
      bestIndex = entry.index;
      if (dE < threshold) break; // Early exit: imperceptível
    }
  }

  return { index: bestIndex, deltaE: bestDeltaE };
}

/**
 * Busca top-N cores mais próximas (para alternativas/confiança)
 */
export function findTopNClosest(
  targetLab: LabColor,
  lut: DeltaELutEntry[],
  n: number
): Array<{ index: number; deltaE: number }> {
  const results: Array<{ index: number; deltaE: number }> = [];

  for (const entry of lut) {
    const dE = deltaE2000(targetLab, entry.lab);
    results.push({ index: entry.index, deltaE: dE });
  }

  results.sort((a, b) => a.deltaE - b.deltaE);
  return results.slice(0, n);
}

// ============================================================================
// Utilitários de Confiança Perceptual
// ============================================================================

/**
 * Converte Delta E em confiança perceptual (0-100)
 *
 * Baseado em limiares CIE:
 * - ΔE < 1.0: imperceptível → 100%
 * - ΔE 1-2: limiar perceptível → 90-70%
 * - ΔE 2-5: diferença clara → 70-30%
 * - ΔE > 5: cores obviamente diferentes → <30%
 */
export function deltaEToConfidence(deltaE: number): number {
  if (deltaE <= 1.0) return 100;
  if (deltaE <= 2.0) return Math.round(90 - 20 * (deltaE - 1.0));
  if (deltaE <= 5.0) return Math.round(70 - 40 * (deltaE - 2.0) / 3.0);
  return Math.max(0, Math.round(30 - 30 * Math.min(1, (deltaE - 5.0) / 10.0)));
}

/**
 * Calcula confiança considerando a 2ª cor mais próxima (margem de ambiguidade)
 *
 * Se a 2ª cor está muito próxima da 1ª, a confiança cai.
 * marginRatio = deltaE2 / deltaE1 (quanto maior, mais distinto é o match)
 */
export function calculatePerceptualConfidence(
  deltaE1: number,
  deltaE2: number
): { confidence: number; isAmbiguous: boolean; marginRatio: number } {
  const baseConfidence = deltaEToConfidence(deltaE1);

  if (deltaE1 === 0) return { confidence: 100, isAmbiguous: false, marginRatio: Infinity };

  const marginRatio = deltaE2 / deltaE1;

  // Se 2ª cor está a menos de 1.5x a distância da 1ª → ambíguo
  const isAmbiguous = marginRatio < 1.5;

  // Penalizar confiança se ambíguo
  let confidence = baseConfidence;
  if (isAmbiguous) {
    // Reduzir linearmente de 100% (ratio=1.5) para 50% (ratio=1.0)
    const penalty = Math.max(0, (1.5 - marginRatio) / 0.5 * 0.5);
    confidence = Math.round(baseConfidence * (1 - penalty));
  }

  return { confidence: Math.max(0, Math.min(100, confidence)), isAmbiguous, marginRatio };
}

// ============================================================================
// Cache de Conversões (Para Performance em Loop de Detecção)
// ============================================================================

/** Cache simples LRU para conversões RGB↔Lab repetidas */
export class ColorConversionCache {
  private cache = new Map<string, LabColor>();
  private maxSize: number;

  constructor(maxSize = 256) {
    this.maxSize = maxSize;
  }

  private key(rgb: RgbColor): string {
    return `${rgb.r},${rgb.g},${rgb.b}`;
  }

  get(rgb: RgbColor): LabColor | undefined {
    return this.cache.get(this.key(rgb));
  }

  set(rgb: RgbColor, lab: LabColor): void {
    if (this.cache.size >= this.maxSize) {
      // Remover primeira entrada (LRU simples)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(this.key(rgb), lab);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Instância global para uso no loop de detecção
export const colorConversionCache = new ColorConversionCache(512);

/**
 * sRGB → Lab com cache (para frames repetidos)
 */
export function srgbToLabCached(rgb: RgbColor): LabColor {
  const cached = colorConversionCache.get(rgb);
  if (cached) return cached;

  const lab = srgbToLab(rgb);
  colorConversionCache.set(rgb, lab);
  return lab;
}

/**
 * Limpa o cache de conversão global
 */
export function clearColorCache(): void {
  colorConversionCache.clear();
}

// ============================================================================
// Temperatura de Cor Correlacionada (CCT) e Ponto Branco
// ============================================================================

/**
 * Estima a Temperatura de Cor Correlacionada (CCT) em Kelvin
 * a partir de coordenadas cromáticas xy (CIE 1931).
 *
 * Usa a aproximação de McCamy (1992) - precisa o suficiente para white balance.
 * Válida para ~2000K a ~20000K.
 *
 * @param x - Coordenada x cromática (0-1)
 * @param y - Coordenada y cromática (0-1)
 * @returns CCT em Kelvin, ou null se fora do domínio válido
 */
export function estimateCctFromXy(x: number, y: number): number | null {
  // Verificar se está no domínio válido do locus do corpo negro
  if (x <= 0 || y <= 0 || x + y >= 1) return null;

  // n = (x - 0.3320) / (0.1858 - y)  -- McCamy
  const n = (x - 0.3320) / (0.1858 - y);

  // Polinômio de McCamy: CCT = 449*n³ + 3525*n² + 6823.3*n + 5520.33
  const cct = 449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33;

  // Clampar a faixa razoável
  if (cct < 1000 || cct > 25000) return null;

  return Math.round(cct);
}

/**
 * Estima CCT a partir de RGB linear (0-1).
 * Converte para XYZ e depois para xy.
 */
export function estimateCctFromLinearRgb(linear: { r: number; g: number; b: number }): number | null {
  const xyz = linearRgbToXyz(linear);
  const sum = xyz.X + xyz.Y + xyz.Z;
  if (sum === 0) return null;
  const x = xyz.X / sum;
  const y = xyz.Y / sum;
  return estimateCctFromXy(x, y);
}

/**
 * Estima CCT a partir de RGB sRGB (0-255).
 */
export function estimateCctFromSrgb(rgb: RgbColor): number | null {
  const linear = srgbToLinear(rgb);
  return estimateCctFromLinearRgb(linear);
}

/**
 * Estima CCT médio de uma imagem (média de pixels no centro).
 * Útil para detectar a temperatura da luz ambiente.
 */
export function estimateImageCct(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  centerX?: number,
  centerY?: number,
  regionRadius: number = 30
): number | null {
  const x = centerX ?? Math.floor(width / 2);
  const y = centerY ?? Math.floor(height / 2);

  const startX = Math.max(0, x - regionRadius);
  const endX = Math.min(width, x + regionRadius);
  const startY = Math.max(0, y - regionRadius);
  const endY = Math.min(height, y + regionRadius);

  let totalR = 0, totalG = 0, totalB = 0;
  let count = 0;

  for (let yy = startY; yy < endY; yy++) {
    for (let xx = startX; xx < endX; xx++) {
      const idx = (yy * width + xx) * 4;
      const alpha = imageData[idx + 3];
      if (alpha < 128) continue;
      totalR += imageData[idx];
      totalG += imageData[idx + 1];
      totalB += imageData[idx + 2];
      count++;
    }
  }

  if (count === 0) return null;

  const avgRgb: RgbColor = {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };

  return estimateCctFromSrgb(avgRgb);
}

/**
 * Ponto branco (white point) XYZ para uma dada temperatura de cor (CCT em Kelvin).
 *
 * Usa a aproximação de Robertson (1968) / CIE 15:2004 para o locus do corpo negro
 * (1667K - 4000K e 4000K - 7000K) onde t = T/100.
 * Para > 7000K usa a aproximação CIE D-illuminant (Judd-MacAdam).
 * Retorna XYZ normalizado para Y=100 (mesma escala do D65_WHITE_POINT).
 */
export function whitePointFromCct(cct: number): XyzColor {
  // Clampar CCT
  const T = Math.max(1667, Math.min(25000, cct));

  let x: number, y: number;

  if (T <= 4000) {
    // Faixa 1667K - 4000K (tungstênio/incandescente) - Robertson
    // T em Kelvin, fórmula usa 10^9/T^3, 10^6/T^2, 10^3/T
    const T2 = T * T;
    const T3 = T2 * T;
    x = -0.2661239 * 1e9 / T3 - 0.2343580 * 1e6 / T2 + 0.8776956 * 1e3 / T + 0.179910;
    y = -1.1063814 * x * x * x - 1.3481102 * x * x + 2.1855583 * x - 0.20219683;
  } else if (T <= 7000) {
    // Faixa 4000K - 7000K - Robertson
    // T em Kelvin, fórmula usa 10^9/T^3, 10^6/T^2, 10^3/T
    const T2 = T * T;
    const T3 = T2 * T;
    x = -3.0258469 * 1e9 / T3 + 2.1070379 * 1e6 / T2 + 0.2226347 * 1e3 / T + 0.240390;
    y = 3.0817580 * x * x * x - 5.8733867 * x * x + 3.7511299 * x - 0.37001483;
  } else {
    // Faixa 7000K - 25000K - Aproximação CIE D-illuminant (Judd et al.)
    // Para luz do dia: x = 0.244063 + 0.09911*(1000/T) + 2.9678*(1000/T)^2 - 4.6070*(1000/T)^3
    // y = -3.000*x^2 + 2.87*x - 0.275
    const invTk = 1000 / T; // 1000/T in kK^-1
    const invTk2 = invTk * invTk;
    const invTk3 = invTk2 * invTk;
    x = 0.244063 + 0.09911 * invTk + 2.9678 * invTk2 - 4.6070 * invTk3;
    y = -3.000 * x * x + 2.87 * x - 0.275;
  }

  // Garantir xy válidos (dentro do diagrama de cromaticidade CIE 1931)
  x = Math.max(0.18, Math.min(0.45, x));
  y = Math.max(0.15, Math.min(0.45, y));

  // Converter xy para XYZ (Y = 100)
  const Y = 100;
  const X = (x / y) * Y;
  const Z = ((1 - x - y) / y) * Y;

  return { X, Y, Z };
}

/**
 * Classifica a temperatura de cor em categorias perceptuais.
 */
export type ColorTemperatureCategory = 'muito-quente' | 'quente' | 'neutro' | 'fria' | 'muito-fria';

export function categorizeColorTemperature(cct: number): ColorTemperatureCategory {
  if (cct < 2500) return 'muito-quente';   // vela, nascer do sol
  if (cct < 3500) return 'quente';         // incandescente, tungsteno
  if (cct < 5000) return 'neutro';         // luz manhã/tarde, fluorescentes quentes
  if (cct < 7500) return 'fria';           // luz do dia, flash, fluorescentes frios
  return 'muito-fria';                     // céu azul, sombra
}

/**
 * Descrição amigável da temperatura de cor para TTS/UI.
 */
export function describeColorTemperature(cct: number): string {
  const cat = categorizeColorTemperature(cct);
  const descriptions: Record<ColorTemperatureCategory, string> = {
    'muito-quente': 'luz muito quente (vela, nascer do sol)',
    'quente': 'luz quente (incandescente, tungstênio)',
    'neutro': 'luz neutra (manhã/tarde, fluorescente quente)',
    'fria': 'luz fria (luz do dia, flash, fluorescente frio)',
    'muito-fria': 'luz muito fria (céu azul, sombra)',
  };
  return `${Math.round(cct)} K — ${descriptions[cat]}`;
}

/**
 * Aplica correção de white balance (adaptação cromática) a uma cor RGB
 * baseada na temperatura de cor detectada da cena.
 *
 * Isso "neutraliza" o viés de cor da iluminação para que a cor detectada
 * corresponda à cor real do objeto sob luz de referência (D65).
 *
 * @param rgb - Cor detectada (sRGB 0-255)
 * @param sceneCct - Temperatura de cor estimada da cena em Kelvin
 * @returns Cor corrigida (sRGB 0-255)
 */
export function applyWhiteBalanceCorrection(rgb: RgbColor, sceneCct: number): RgbColor {
  // Se CCT é próximo de D65 (6500K), não precisa corrigir
  if (Math.abs(sceneCct - 6500) < 300) return rgb;

  // Ponto branco da cena (iluminação atual)
  const sceneWhite = whitePointFromCct(sceneCct);

  // Pipeline: sRGB -> Linear -> XYZ -> Adaptação cromática (Bradford) -> XYZ -> Linear -> sRGB
  const linear = srgbToLinear(rgb);
  const xyz = linearRgbToXyz(linear);
  const adaptedXyz = chromaticAdaptation(xyz, sceneWhite, D65_WHITE_POINT);
  const adaptedLinear = xyzToLinearRgb(adaptedXyz);
  return linearToSrgb(adaptedLinear);
}

/**
 * Estima CCT e aplica correção de white balance em uma única chamada.
 * Retorna a cor corrigida e o CCT estimado.
 */
export function correctColorForIlluminant(
  rgb: RgbColor,
  imageData?: Uint8ClampedArray,
  width?: number,
  height?: number,
  centerX?: number,
  centerY?: number,
  regionRadius?: number
): { correctedRgb: RgbColor; sceneCct: number | null; temperatureCategory: ColorTemperatureCategory | null } {
  // Estimar CCT da cena
  let sceneCct: number | null = null;
  if (imageData && width && height) {
    sceneCct = estimateImageCct(imageData, width, height, centerX, centerY, regionRadius);
  }

  // Se não conseguiu estimar da imagem, tentar estimar do próprio pixel (menos confiável)
  if (sceneCct === null) {
    sceneCct = estimateCctFromSrgb(rgb);
  }

  if (sceneCct === null) {
    return {
      correctedRgb: rgb,
      sceneCct: null,
      temperatureCategory: null,
    };
  }

  const correctedRgb = applyWhiteBalanceCorrection(rgb, sceneCct);
  const temperatureCategory = categorizeColorTemperature(sceneCct);

  return { correctedRgb, sceneCct, temperatureCategory };
}