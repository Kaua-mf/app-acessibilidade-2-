/**
 * Light Analysis (funções puras, sem dependência de React Native)
 *
 * Estima "quanta luz há" a partir de uma foto da câmera. Funciona em Android,
 * iOS e web, ao contrário do sensor de luz ambiente (que só existe no Android
 * e mede onde o celular está, não para onde a câmera aponta).
 *
 * Problema: a câmera ajusta a exposição sozinha, então o brilho médio dos
 * pixels quase não muda entre um quarto escuro e uma sala clara. Por isso:
 *  1. Quando a foto traz EXIF (tempo de exposição, ISO, abertura, ou o
 *     BrightnessValue do iOS), calculamos o brilho real da cena em EV, que
 *     leva em conta a exposição escolhida pela câmera.
 *  2. Sem EXIF, usamos a luminosidade percebida (CIE L*) dos pixels.
 * Nos dois casos a escala é logarítmica, como a percepção humana de luz.
 */

/** EV100 mapeado para 0%: ambiente muito escuro. */
export const EV_AT_0_PERCENT = 0;
/** EV100 mapeado para 100%: sol forte ao ar livre. */
export const EV_AT_100_PERCENT = 15;

/** Luminância linear (0-1) que a câmera costuma tentar obter (cinza médio). */
const MIDDLE_GRAY = 0.18;

/** Quanto os pixels podem corrigir o EV vindo do EXIF (em stops). */
const MAX_PIXEL_CORRECTION_EV = 4;

export type LightSource = 'exif-brightness' | 'exif-exposure' | 'pixels';

export interface LightEstimate {
  /** Nível de luz de 0 a 100 (escala logarítmica). */
  percentage: number;
  /** De onde veio a estimativa. */
  source: LightSource;
  /** EV100 estimado da cena (só quando veio do EXIF). */
  ev?: number;
}

export interface ExposureInfo {
  exposureTime?: number; // segundos
  iso?: number;
  fNumber?: number;
  brightnessValue?: number; // APEX Bv (iOS)
}

// Tabela sRGB (0-255) -> luminância linear (0-1)
const SRGB_TO_LINEAR: Float32Array = (() => {
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    table[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return table;
})();

/**
 * Luminância linear média (0-1) de uma imagem RGBA, com pesos Rec. 709.
 * Pixels quase transparentes são ignorados.
 */
export function meanLinearLuminance(rgba: ArrayLike<number>): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    total +=
      0.2126 * SRGB_TO_LINEAR[rgba[i] & 255] +
      0.7152 * SRGB_TO_LINEAR[rgba[i + 1] & 255] +
      0.0722 * SRGB_TO_LINEAR[rgba[i + 2] & 255];
    count++;
  }
  return count === 0 ? 0 : total / count;
}

/** Luminosidade percebida CIE L* (0-100) a partir da luminância linear (0-1). */
export function lightnessFromLuminance(luminance: number): number {
  const y = Math.max(0, Math.min(1, luminance));
  const lStar = y <= 0.008856 ? 903.3 * y : 116 * Math.cbrt(y) - 16;
  return Math.max(0, Math.min(100, lStar));
}

/** Converte um EV100 estimado em porcentagem (0-100), em escala logarítmica. */
export function evToPercentage(ev: number): number {
  const fraction = (ev - EV_AT_0_PERCENT) / (EV_AT_100_PERCENT - EV_AT_0_PERCENT);
  return Math.max(0, Math.min(100, fraction * 100));
}

/** Lê um número de formatos variados: 0.033, "0.033", "1/30", [100], etc. */
function parseNumber(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    return value.length > 0 ? parseNumber(value[0]) : undefined;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const text = value.trim();
    const fraction = /^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(text);
    if (fraction) {
      const denominator = parseFloat(fraction[2]);
      return denominator === 0 ? undefined : parseFloat(fraction[1]) / denominator;
    }
    const parsed = parseFloat(text);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function pick(sources: Record<string, unknown>[], keys: string[]): number | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const parsed = parseNumber(source[key]);
      if (parsed !== undefined) return parsed;
    }
  }
  return undefined;
}

/**
 * Extrai os dados de exposição do EXIF devolvido pela câmera.
 * No iOS os campos costumam vir dentro de "{Exif}"; no Android, no nível raiz.
 */
export function parseExposureInfo(exif: unknown): ExposureInfo {
  if (!exif || typeof exif !== 'object') return {};

  const root = exif as Record<string, unknown>;
  const sources: Record<string, unknown>[] = [root];
  for (const nestedKey of ['{Exif}', 'Exif']) {
    const nested = root[nestedKey];
    if (nested && typeof nested === 'object') {
      sources.push(nested as Record<string, unknown>);
    }
  }

  const exposureTime = pick(sources, ['ExposureTime']);
  const iso = pick(sources, ['ISOSpeedRatings', 'PhotographicSensitivity', 'ISO']);
  let fNumber = pick(sources, ['FNumber']);
  if (fNumber === undefined) {
    const apertureValue = pick(sources, ['ApertureValue']);
    if (apertureValue !== undefined) {
      fNumber = Math.pow(2, apertureValue / 2);
    }
  }
  const brightnessValue = pick(sources, ['BrightnessValue']);

  return {
    exposureTime: exposureTime !== undefined && exposureTime > 0 ? exposureTime : undefined,
    iso: iso !== undefined && iso > 0 ? iso : undefined,
    fNumber: fNumber !== undefined && fNumber > 0 ? fNumber : undefined,
    brightnessValue,
  };
}

/**
 * EV100 da exposição escolhida pela câmera: log2(N²/t) - log2(ISO/100).
 * Cenas mais claras fazem a câmera escolher exposições "mais rápidas", e
 * esse número sobe.
 */
export function exposureEv100(exposureTime: number, iso: number, fNumber: number): number {
  return Math.log2((fNumber * fNumber) / exposureTime) - Math.log2(iso / 100);
}

/**
 * Estima o nível de luz (0-100) de uma foto.
 *
 * @param meanLuminance Luminância linear média (0-1) dos pixels da foto.
 * @param exif EXIF devolvido pela câmera (opcional).
 */
export function estimateLight(meanLuminance: number, exif?: unknown): LightEstimate {
  const info = parseExposureInfo(exif);

  // 1) iOS: o BrightnessValue (APEX) já é o brilho da cena. EV100 = Bv + 5.
  if (info.brightnessValue !== undefined) {
    const ev = info.brightnessValue + 5;
    return { percentage: Math.round(evToPercentage(ev)), source: 'exif-brightness', ev };
  }

  // 2) Exposição escolhida pela câmera, corrigida pelo brilho real dos pixels
  if (info.exposureTime !== undefined && info.iso !== undefined && info.fNumber !== undefined) {
    const base = exposureEv100(info.exposureTime, info.iso, info.fNumber);
    const luminance = Math.max(1e-4, meanLuminance);
    const correction = Math.max(
      -MAX_PIXEL_CORRECTION_EV,
      Math.min(MAX_PIXEL_CORRECTION_EV, Math.log2(luminance / MIDDLE_GRAY))
    );
    const ev = base + correction;
    return { percentage: Math.round(evToPercentage(ev)), source: 'exif-exposure', ev };
  }

  // 3) Sem EXIF: luminosidade percebida dos pixels
  return {
    percentage: Math.round(lightnessFromLuminance(meanLuminance)),
    source: 'pixels',
  };
}

export interface LightSmoother {
  /** Suaviza um novo valor (média móvel exponencial). */
  smooth(value: number): number;
  reset(): void;
}

/**
 * Suaviza as leituras para o apito não "pular" a cada foto.
 * @param alpha Peso da leitura nova (0-1). 1 = sem suavização.
 */
export function createLightSmoother(alpha: number = 0.5): LightSmoother {
  const weight = Math.max(0.05, Math.min(1, alpha));
  let current: number | null = null;

  return {
    smooth(value: number): number {
      current = current === null ? value : current + weight * (value - current);
      return current;
    },
    reset(): void {
      current = null;
    },
  };
}
