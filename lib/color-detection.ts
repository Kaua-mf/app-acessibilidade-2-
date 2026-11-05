/**
 * Color Detection Utility
 *
 * Analisa dados de imagem para detectar e identificar cores.
 * Usa CIELAB + Delta E 2000 para distância perceptual precisa,
 * base de cores expandida (~280 cores), e confiança inteligente
 * que considera ambiguidade com a 2ª cor mais próxima.
 */

import {
  RgbColor,
  LabColor,
  srgbToLab,
  deltaE2000,
  deltaEToConfidence,
  calculatePerceptualConfidence,
  findTopNClosest,
  buildDeltaELut,
  colorConversionCache,
  srgbToLabCached,
  // Novas funções para temperatura de cor e white balance
  estimateImageCct,
  applyWhiteBalanceCorrection,
  correctColorForIlluminant,
  describeColorTemperature,
  ColorTemperatureCategory,
} from './color-science';

import {
  COLOR_DATABASE,
  ColorEntry,
  COLOR_LABS,
  getAvailableColorNames as getDbColorNames,
} from './color-database';

export interface ColorData {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  confidence: number;
  /** Cores alternativas quando a detecção é ambígua (top 3) */
  alternatives?: Array<{ name: string; hex: string; confidence: number }>;
  /** Indica se a cor detectada é ambígua (próxima de outra) */
  isAmbiguous?: boolean;
  /** Temperatura de cor estimada da cena em Kelvin */
  sceneCct?: number | null;
  /** Categoria da temperatura de cor (muito-quente, quente, neutro, fria, muito-fria) */
  temperatureCategory?: ColorTemperatureCategory | null;
  /** Descrição amigável da temperatura de cor para TTS/UI */
  temperatureDescription?: string | null;
  /** Se a correção de white balance foi aplicada */
  whiteBalanceCorrected?: boolean;
}

interface PixelData {
  r: number;
  g: number;
  b: number;
  a: number;
}

// LUT pré-construída para busca rápida de Delta E
const DELTA_E_LUT = buildDeltaELut(COLOR_LABS);

/**
 * Converte RGB para HSL (mantido para compatibilidade com UI existente)
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Extrai pixel em coordenadas específicas
 */
function getPixelAt(
  imageData: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): PixelData {
  const index = (y * width + x) * 4;
  return {
    r: imageData[index],
    g: imageData[index + 1],
    b: imageData[index + 2],
    a: imageData[index + 3],
  };
}

/**
 * Média de pixels em uma região quadrada (para detecção mais estável)
 * Ignora pixels transparentes (alpha < 128)
 */
function averagePixelsInRegion(
  imageData: Uint8ClampedArray,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  regionSize: number = 20
): PixelData {
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  const startX = Math.max(0, centerX - regionSize);
  const endX = Math.min(width, centerX + regionSize);
  const startY = Math.max(0, centerY - regionSize);
  const endY = Math.min(height, centerY + regionSize);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const pixel = getPixelAt(imageData, x, y, width);
      if (pixel.a > 128) {
        totalR += pixel.r;
        totalG += pixel.g;
        totalB += pixel.b;
        count++;
      }
    }
  }

  if (count === 0) {
    return { r: 128, g: 128, b: 128, a: 255 };
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
    a: 255,
  };
}

/**
 * Encontra as N cores mais próximas usando Delta E 2000
 * Retorna array ordenado por proximidade perceptual
 */
function findClosestColorsPerceptual(
  rgb: RgbColor,
  n: number = 3
): Array<{ entry: ColorEntry; deltaE: number }> {
  // Usar cache para conversão RGB→Lab (frames repetidos)
  const lab = srgbToLabCached(rgb);
  const results = findTopNClosest(lab, DELTA_E_LUT, n);

  return results.map(({ index, deltaE }) => ({
    entry: COLOR_DATABASE[index],
    deltaE,
  }));
}

/**
 * Detecta cor a partir de dados de imagem (RGBA)
 *
 * @param imageData - Dados brutos da imagem (formato RGBA)
 * @param width - Largura da imagem
 * @param height - Altura da imagem
 * @param centerX - Coordenada X do centro (padrão: centro da imagem)
 * @param centerY - Coordenada Y do centro (padrão: centro da imagem)
 * @param regionRadius - Meio-lado do quadrado de média, em pixels (padrão: 15)
 * @returns Dados da cor com nome, hex, RGB, HSL, confiança, alternativas e info de temperatura
 */
export function detectColorFromImageData(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  centerX?: number,
  centerY?: number,
  regionRadius: number = 15
): ColorData {
  // Usar centro da imagem se coordenadas não fornecidas
  const x = centerX ?? Math.floor(width / 2);
  const y = centerY ?? Math.floor(height / 2);

  // Média de pixels na região para detecção mais estável
  const avgPixel = averagePixelsInRegion(imageData, x, y, width, height, Math.max(1, regionRadius));

  const rgb: RgbColor = { r: avgPixel.r, g: avgPixel.g, b: avgPixel.b };

  // Aplicar correção de white balance baseada na temperatura de cor da cena (SEMPRE ATIVO)
  // Só aplica a correção se a temperatura não for neutra E a cor não for altamente saturada
  // (cores saturadas são objetos, não iluminantes)
  const correction = correctColorForIlluminant(
    rgb,
    imageData,
    width,
    height,
    x,
    y,
    Math.max(15, regionRadius * 2) // Região maior para estimar CCT
  );
  const sceneCct = correction.sceneCct;
  const temperatureCategory = correction.temperatureCategory;

  // Calcular saturação para detectar se é um objeto colorido vs iluminante
  const maxVal = Math.max(rgb.r, rgb.g, rgb.b);
  const minVal = Math.min(rgb.r, rgb.g, rgb.b);
  const saturation = maxVal > 0 ? (maxVal - minVal) / maxVal : 0;

  // Só aplicar white balance se a temperatura indica um color cast significativo
  // em relação ao D65 (6500K). Não corrigir para 'neutro' (3500-5000K) e 'fria' (5000-7500K)
  // pois 'fria' inclui o próprio D65 (6500K - luz de referência).
  // Corrigir apenas para: 'muito-quente', 'quente' (muito quente), 'muito-fria' (muito fria).
  const shouldCorrect = temperatureCategory === 'muito-quente'
    || temperatureCategory === 'quente'
    || temperatureCategory === 'muito-fria';

  const whiteBalanceCorrected = shouldCorrect && saturation < 0.7;

  // Usar RGB corrigido apenas se o white balance foi realmente aplicado
  const correctedRgb = whiteBalanceCorrected ? correction.correctedRgb : rgb;

  // Buscar top 3 cores mais próximas perceptualment (usando RGB corrigido)
  const closest = findClosestColorsPerceptual(correctedRgb, 3);

  if (closest.length === 0) {
    // Fallback improvável (base não vazia)
    return {
      name: 'Desconhecida',
      hex: '#808080',
      rgb: correctedRgb,
      hsl: rgbToHsl(correctedRgb.r, correctedRgb.g, correctedRgb.b),
      confidence: 0,
      alternatives: [],
      isAmbiguous: false,
      sceneCct,
      temperatureCategory,
      temperatureDescription: sceneCct ? describeColorTemperature(sceneCct) : null,
      whiteBalanceCorrected,
    };
  }

  const best = closest[0];
  const secondBest = closest[1];

  // Calcular confiança perceptual com margem para 2ª cor
  const { confidence, isAmbiguous } = calculatePerceptualConfidence(
    best.deltaE,
    secondBest?.deltaE ?? Infinity
  );

  // Converter para HSL (compatibilidade) - usar RGB corrigido
  const hsl = rgbToHsl(correctedRgb.r, correctedRgb.g, correctedRgb.b);

  // Preparar alternativas para TTS/UI (top 3, exceto a melhor)
  const alternatives = closest.slice(1).map(({ entry, deltaE }) => ({
    name: entry.name,
    hex: entry.hex,
    confidence: deltaEToConfidence(deltaE),
  }));

  return {
    name: best.entry.name,
    hex: best.entry.hex,
    rgb: correctedRgb,
    hsl,
    confidence,
    alternatives,
    isAmbiguous,
    sceneCct,
    temperatureCategory,
    temperatureDescription: sceneCct ? describeColorTemperature(sceneCct) : null,
    whiteBalanceCorrected,
  };
}

/**
 * Retorna todos os nomes de cores disponíveis na base
 */
export function getAvailableColors(): string[] {
  return getDbColorNames();
}

/**
 * Converte hex para RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Converte RGB para hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
      .toUpperCase()
  );
}

/**
 * Limpa o cache de conversão (útil para testes ou troca de iluminante)
 */
export function clearColorCache(): void {
  colorConversionCache.clear();
}

/**
 * Obtém entrada completa da base por nome
 */
export function getColorEntry(name: string): ColorEntry | undefined {
  return COLOR_DATABASE.find(c => c.name.toLowerCase() === name.toLowerCase());
}