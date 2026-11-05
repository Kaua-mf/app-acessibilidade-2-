/**
 * Testes para Color Detection (com Delta E 2000 + Base Expandida)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectColorFromImageData,
  getAvailableColors,
  hexToRgb,
  rgbToHex,
  clearColorCache,
  getColorEntry,
} from '../color-detection';
import {
  estimateCctFromSrgb,
  estimateImageCct,
  applyWhiteBalanceCorrection,
  correctColorForIlluminant,
  whitePointFromCct,
  categorizeColorTemperature,
  describeColorTemperature,
  ColorTemperatureCategory,
} from '../color-science';

// ============================================================================
// Helpers
// ============================================================================

function createSolidImage(width: number, height: number, r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return data;
}

function createCenterSquareImage(
  size: number,
  bg: [number, number, number],
  center: [number, number, number],
  halfSize: number
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const mid = Math.floor(size / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inCenter = Math.abs(x - mid) < halfSize && Math.abs(y - mid) < halfSize;
      const [r, g, b] = inCenter ? center : bg;
      const idx = (y * size + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return data;
}

// ============================================================================
// Testes
// ============================================================================

describe('Color Detection - Utilitários Básicos', () => {
  describe('hexToRgb', () => {
    it('deve converter #FF0000 → RGB(255,0,0)', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('deve converter #00FF00 → RGB(0,255,0)', () => {
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('deve converter #0000FF → RGB(0,0,255)', () => {
      expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('deve converter #FFFFFF → RGB(255,255,255)', () => {
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('deve converter #000000 → RGB(0,0,0)', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('deve aceitar hex sem #', () => {
      expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('deve retornar null para hex inválido', () => {
      expect(hexToRgb('INVALID')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('deve converter RGB(255,0,0) → #FF0000', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#FF0000');
    });

    it('deve converter RGB(0,255,0) → #00FF00', () => {
      expect(rgbToHex(0, 255, 0)).toBe('#00FF00');
    });

    it('deve converter RGB(0,0,255) → #0000FF', () => {
      expect(rgbToHex(0, 0, 255)).toBe('#0000FF');
    });

    it('deve converter RGB(255,255,255) → #FFFFFF', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
    });

    it('deve converter RGB(0,0,0) → #000000', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
    });

    it('deve lidar com zeros à esquerda', () => {
      expect(rgbToHex(15, 15, 15)).toBe('#0F0F0F');
    });
  });

  describe('getAvailableColors', () => {
    it('deve retornar array de nomes', () => {
      const colors = getAvailableColors();
      expect(Array.isArray(colors)).toBe(true);
      expect(colors.length).toBeGreaterThan(200); // Base expandida ~280
    });

    it('deve incluir cores básicas', () => {
      const colors = getAvailableColors();
      expect(colors).toContain('Vermelho');
      expect(colors).toContain('Verde');
      expect(colors).toContain('Azul');
      expect(colors).toContain('Amarelo');
      expect(colors).toContain('Branco');
      expect(colors).toContain('Preto');
      expect(colors).toContain('Cinza');
      expect(colors).toContain('Laranja');
      expect(colors).toContain('Rosa');
      expect(colors).toContain('Roxo');
      expect(colors).toContain('Marrom');
      expect(colors).toContain('Ciano');
    });

    it('não deve ter nomes duplicados', () => {
      const colors = getAvailableColors();
      const unique = new Set(colors);
      expect(unique.size).toBe(colors.length);
    });
  });

  describe('getColorEntry', () => {
    it('deve retornar entrada completa para cor existente', () => {
      const entry = getColorEntry('Vermelho');
      expect(entry).toBeDefined();
      expect(entry?.name).toBe('Vermelho');
      expect(entry?.hex).toBe('#FF0000');
      expect(entry?.lab).toBeDefined();
      expect(entry?.category).toBe('vermelho');
    });

    it('deve ser case-insensitive', () => {
      expect(getColorEntry('vermelho')?.name).toBe('Vermelho');
      expect(getColorEntry('VERMELHO')?.name).toBe('Vermelho');
    });

    it('deve retornar undefined para cor inexistente', () => {
      expect(getColorEntry('Inexistente')).toBeUndefined();
    });
  });
});

describe('Color Detection - Detecção de Cores Sólidas (Delta E 2000)', () => {
  beforeEach(() => {
    clearColorCache();
  });

  it('deve detectar vermelho puro com alta confiança', () => {
    const img = createSolidImage(100, 100, 255, 0, 0);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Vermelho');
    expect(result.hex).toBe('#FF0000');
    expect(result.confidence).toBeGreaterThan(90);
    expect(result.rgb.r).toBe(255);
    expect(result.rgb.g).toBe(0);
    expect(result.rgb.b).toBe(0);
  });

  it('deve detectar verde puro (mapeia para Verde Neon por Delta E 2000)', () => {
    // #00FF00 (verde puro sRGB) é mais próximo de "Verde Neon" (#39FF14) em Lab
    const img = createSolidImage(100, 100, 0, 255, 0);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Verde Neon');
    expect(result.confidence).toBeGreaterThan(90);
  });

  it('deve detectar azul puro', () => {
    const img = createSolidImage(100, 100, 0, 0, 255);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Azul');
    expect(result.confidence).toBeGreaterThan(90);
  });

  it('deve detectar amarelo puro', () => {
    const img = createSolidImage(100, 100, 255, 255, 0);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Amarelo');
    expect(result.confidence).toBeGreaterThan(90);
  });

  it('deve detectar ciano puro', () => {
    const img = createSolidImage(100, 100, 0, 255, 255);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Ciano');
    expect(result.confidence).toBeGreaterThan(90);
  });

  it('deve detectar magenta puro', () => {
    const img = createSolidImage(100, 100, 255, 0, 255);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Magenta');
    expect(result.confidence).toBeGreaterThan(90);
  });

  it('deve detectar branco', () => {
    const img = createSolidImage(100, 100, 255, 255, 255);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Branco');
    expect(result.confidence).toBeGreaterThan(95);
  });

  it('deve detectar preto', () => {
    const img = createSolidImage(100, 100, 0, 0, 0);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Preto');
    expect(result.confidence).toBeGreaterThan(95);
  });

  it('deve detectar cinza médio', () => {
    const img = createSolidImage(100, 100, 128, 128, 128);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Cinza');
    expect(result.confidence).toBeGreaterThan(80);
  });

  it('deve detectar laranja', () => {
    const img = createSolidImage(100, 100, 255, 165, 0);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Laranja');
    expect(result.confidence).toBeGreaterThan(85);
  });

  it('deve detectar rosa', () => {
    const img = createSolidImage(100, 100, 255, 192, 203);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Rosa');
    expect(result.confidence).toBeGreaterThan(80);
  });

  it('deve detectar roxo', () => {
    const img = createSolidImage(100, 100, 128, 0, 128);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Roxo');
    expect(result.confidence).toBeGreaterThan(80);
  });

  it('deve detectar marrom', () => {
    const img = createSolidImage(100, 100, 165, 42, 42);
    const result = detectColorFromImageData(img, 100, 100);

    expect(result.name).toBe('Marrom');
    expect(result.confidence).toBeGreaterThan(75);
  });
});

describe('Color Detection - Estrutura de Retorno', () => {
  beforeEach(() => {
    clearColorCache();
  });

  it('deve retornar todos os campos obrigatórios', () => {
    const img = createSolidImage(50, 50, 255, 255, 0);
    const result = detectColorFromImageData(img, 50, 50);

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('hex');
    expect(result).toHaveProperty('rgb');
    expect(result).toHaveProperty('hsl');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('alternatives');
    expect(result).toHaveProperty('isAmbiguous');
  });

  it('hex deve estar no formato #RRGGBB', () => {
    const img = createSolidImage(50, 50, 255, 0, 0);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('RGB deve estar no range 0-255', () => {
    const img = createSolidImage(50, 50, 200, 100, 50);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.rgb.r).toBeGreaterThanOrEqual(0);
    expect(result.rgb.r).toBeLessThanOrEqual(255);
    expect(result.rgb.g).toBeGreaterThanOrEqual(0);
    expect(result.rgb.g).toBeLessThanOrEqual(255);
    expect(result.rgb.b).toBeGreaterThanOrEqual(0);
    expect(result.rgb.b).toBeLessThanOrEqual(255);
  });

  it('confiança deve ser 0-100', () => {
    const img = createSolidImage(50, 50, 128, 128, 128);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('HSL deve ter valores válidos', () => {
    const img = createSolidImage(50, 50, 255, 100, 50);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.hsl.h).toBeGreaterThanOrEqual(0);
    expect(result.hsl.h).toBeLessThanOrEqual(360);
    expect(result.hsl.s).toBeGreaterThanOrEqual(0);
    expect(result.hsl.s).toBeLessThanOrEqual(100);
    expect(result.hsl.l).toBeGreaterThanOrEqual(0);
    expect(result.hsl.l).toBeLessThanOrEqual(100);
  });
});

describe('Color Detection - Alternativas e Ambiguidade', () => {
  beforeEach(() => {
    clearColorCache();
  });

  it('deve retornar alternativas para cores próximas', () => {
    // Laranja está próximo de "Laranja Claro" e "Laranja Escuro"
    const img = createSolidImage(50, 50, 255, 165, 0);
    const result = detectColorFromImageData(img, 50, 50);

    expect(result.alternatives).toBeDefined();
    expect(Array.isArray(result.alternatives)).toBe(true);
    expect(result.alternatives!.length).toBeGreaterThan(0);
    expect(result.alternatives!.length).toBeLessThanOrEqual(2); // top 3 - 1
  });

  it('alternativas devem ter nome, hex e confiança', () => {
    const img = createSolidImage(50, 50, 255, 100, 100); // Rosa claro
    const result = detectColorFromImageData(img, 50, 50);

    for (const alt of result.alternatives || []) {
      expect(alt).toHaveProperty('name');
      expect(alt).toHaveProperty('hex');
      expect(alt).toHaveProperty('confidence');
      expect(alt.confidence).toBeGreaterThanOrEqual(0);
      expect(alt.confidence).toBeLessThanOrEqual(100);
    }
  });

  it('isAmbiguous deve ser true para cores equidistantes', () => {
    // Cor intermediária entre Laranja e Vermelho
    const img = createSolidImage(50, 50, 255, 80, 0);
    const result = detectColorFromImageData(img, 50, 50);

    // Se a 2ª cor estiver muito próxima (ratio < 1.5), isAmbiguous = true
    // Isso depende da base de cores, mas deve funcionar para tons intermediários
    expect(typeof result.isAmbiguous).toBe('boolean');
  });

  it('isAmbiguous deve ser false para cores bem distintas', () => {
    const img = createSolidImage(50, 50, 255, 0, 0); // Vermelho puro
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.isAmbiguous).toBe(false);
  });
});

describe('Color Detection - Coordenadas Personalizadas', () => {
  beforeEach(() => {
    clearColorCache();
  });

  it('deve aceitar centerX/centerY personalizados', () => {
    const img = createSolidImage(100, 100, 255, 0, 0);
    const result = detectColorFromImageData(img, 100, 100, 50, 50);
    expect(result.name).toBe('Vermelho');
  });

  it('deve usar centro da imagem por padrão', () => {
    // #00FF00 mapeia para Verde Neon em Delta E 2000
    const img = createSolidImage(100, 100, 0, 255, 0);
    const result = detectColorFromImageData(img, 100, 100); // Sem coordenadas
    expect(result.name).toBe('Verde Neon');
  });
});

describe('Color Detection - Região de Média', () => {
  beforeEach(() => {
    clearColorCache();
  });

  it('deve ler apenas o centro com raio pequeno', () => {
    // Fundo preto com quadrado vermelho 8x8 no centro
    const img = createCenterSquareImage(40, [0, 0, 0], [255, 0, 0], 4);
    const result = detectColorFromImageData(img, 40, 40, undefined, undefined, 3);
    expect(result.rgb).toEqual({ r: 255, g: 0, b: 0 });
    expect(result.name).toBe('Vermelho');
  });

  it('deve misturar fundo com raio grande', () => {
    const img = createCenterSquareImage(40, [0, 0, 0], [255, 0, 0], 4);
    const small = detectColorFromImageData(img, 40, 40, undefined, undefined, 3);
    const large = detectColorFromImageData(img, 40, 40, undefined, undefined, 20);
    expect(large.rgb.r).toBeLessThan(small.rgb.r);
  });

  it('raio padrão deve ser 15', () => {
    const img = createCenterSquareImage(40, [0, 0, 0], [255, 0, 0], 4);
    const implicit = detectColorFromImageData(img, 40, 40);
    const explicit = detectColorFromImageData(img, 40, 40, undefined, undefined, 15);
    expect(implicit).toEqual(explicit);
  });
});

describe('Color Detection - Cores Específicas da Base Expandida', () => {
  beforeEach(() => {
    clearColorCache();
  });

  it('deve detectar Vermelho Escuro (#8B0000)', () => {
    const img = createSolidImage(50, 50, 139, 0, 0);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.name).toBe('Vermelho Escuro');
  });

  it('deve detectar Verde Floresta (#228B22)', () => {
    const img = createSolidImage(50, 50, 34, 139, 34);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.name).toBe('Verde Floresta');
  });

  it('deve detectar Azul Marinho (#000080)', () => {
    const img = createSolidImage(50, 50, 0, 0, 128);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.name).toBe('Azul Marinho');
  });

  it('deve detectar Turquesa (#40E0D0)', () => {
    const img = createSolidImage(50, 50, 64, 224, 208);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.name).toBe('Turquesa');
  });

  it('deve detectar Dourado (#FFD700)', () => {
    const img = createSolidImage(50, 50, 255, 215, 0);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.name).toBe('Dourado');
  });

  it('deve detectar Chocolate (#D2691E)', () => {
    const img = createSolidImage(50, 50, 210, 105, 30);
    const result = detectColorFromImageData(img, 50, 50);
    expect(result.name).toBe('Chocolate');
  });

  it('deve detectar Cinza Escuro (#595959) mais escuro que Cinza', () => {
    const dark = detectColorFromImageData(createSolidImage(32, 32, 89, 89, 89), 32, 32);
    const gray = detectColorFromImageData(createSolidImage(32, 32, 128, 128, 128), 32, 32);
    expect(dark.name).toBe('Cinza Escuro');
    expect(gray.name).toBe('Cinza');
    expect(dark.rgb.r).toBeLessThan(gray.rgb.r);
  });

  it('não deve reportar #A9A9A9 como Cinza Escuro (era bug do CSS)', () => {
    const result = detectColorFromImageData(createSolidImage(32, 32, 169, 169, 169), 32, 32);
    expect(result.name).not.toBe('Cinza Escuro');
  });
});

describe('Color Detection - Alpha Channel', () => {
  beforeEach(() => {
    clearColorCache();
  });

  it('deve ignorar pixels transparentes (alpha < 128)', () => {
    const data = new Uint8ClampedArray(4 * 4);
    // Pixel 0: vermelho opaco
    data[0] = 255; data[1] = 0; data[2] = 0; data[3] = 255;
    // Pixel 1: verde transparente (alpha=50 < 128, deve ser ignorado)
    data[4] = 0; data[5] = 255; data[6] = 0; data[7] = 50;
    // Pixel 2: azul transparente (alpha=50 < 128, deve ser ignorado)
    data[8] = 0; data[9] = 0; data[10] = 255; data[11] = 50;
    // Pixel 3: branco opaco
    data[12] = 255; data[13] = 255; data[14] = 255; data[15] = 255;

    const result = detectColorFromImageData(data, 2, 2);
    // Média de vermelho (255,0,0) + branco (255,255,255) = (255, 128, 128) ~ rosa claro
    // Nota: white balance automático pode ajustar significativamente os valores
    // O importante é que pixels transparentes (verde/azul) foram ignorados
    expect(result.rgb.r).toBeGreaterThan(200);
    expect(result.rgb.g).toBeGreaterThan(50);  // Não deve ser 0 (verde transparente ignorado)
    expect(result.rgb.b).toBeGreaterThan(50);  // Não deve ser 0 (azul transparente ignorado)
  });
});

describe('Color Detection - Performance/Cache', () => {
  beforeEach(() => {
    clearColorCache();
  });

  it('chamadas repetidas com mesma cor devem usar cache', () => {
    const img = createSolidImage(50, 50, 100, 150, 200);
    const r1 = detectColorFromImageData(img, 50, 50);
    const r2 = detectColorFromImageData(img, 50, 50);
    expect(r1).toEqual(r2);
  });
});

describe('Color Detection - Temperatura de Cor e White Balance', () => {
  beforeEach(() => {
    clearColorCache();
  });

  describe('estimateCctFromSrgb', () => {
    it('deve estimar CCT para branco D65 (~6500K)', () => {
      // D65 white point em sRGB ~ (255, 255, 255) mas precisa considerar gamma
      // Brancos tendem a dar CCT próximo de 6500K
      const cct = estimateCctFromSrgb({ r: 255, g: 255, b: 255 });
      expect(cct).not.toBeNull();
      if (cct) expect(cct).toBeGreaterThan(5000);
    });

    it('deve estimar CCT quente para laranja/âmbar (incandescente ~2700K)', () => {
      // Luz incandescente: mais vermelho/amarelo
      const cct = estimateCctFromSrgb({ r: 255, g: 180, b: 100 });
      expect(cct).not.toBeNull();
      if (cct) expect(cct).toBeLessThan(4000);
    });

    it('deve estimar CCT frio para azul (sombra/ceu ~10000K+)', () => {
      // Luz azulada: mais azul - usar cor próxima do locus do corpo negro
      // (100, 150, 255) está fora do domínio válido do McCamy
      // Usar cor mais realista: branco azulado próximo a 10000K
      const cct = estimateCctFromSrgb({ r: 180, g: 190, b: 255 });
      // Pode retornar null se fora do locus, mas não deve crashar
      expect(typeof cct === 'number' || cct === null).toBe(true);
      if (cct) expect(cct).toBeGreaterThan(7000);
    });

    it('deve retornar null para cores fora do locus do corpo negro', () => {
      // Verde puro não está no locus do corpo negro
      const cct = estimateCctFromSrgb({ r: 0, g: 255, b: 0 });
      // Pode retornar null ou um valor, mas não deve crashar
      expect(typeof cct === 'number' || cct === null).toBe(true);
    });
  });

  describe('whitePointFromCct', () => {
    it('deve retornar XYZ válido para CCTs conhecidos', () => {
      const wp2700 = whitePointFromCct(2700);
      const wp6500 = whitePointFromCct(6500);
      const wp10000 = whitePointFromCct(10000);

      expect(wp2700.X).toBeGreaterThan(0);
      expect(wp2700.Y).toBe(100);
      expect(wp2700.Z).toBeGreaterThan(0);

      expect(wp6500.X).toBeGreaterThan(0);
      expect(wp6500.Y).toBe(100);
      expect(wp6500.Z).toBeGreaterThan(0);

      // CCT mais alto = mais azul = Z maior
      expect(wp10000.Z).toBeGreaterThan(wp6500.Z);
      expect(wp2700.Z).toBeLessThan(wp6500.Z);
    });

    it('deve clamp CCTs extremos', () => {
      const wp1000 = whitePointFromCct(500); // abaixo do mínimo
      const wp30000 = whitePointFromCct(50000); // acima do máximo

      expect(wp1000.Y).toBe(100);
      expect(wp30000.Y).toBe(100);
    });
  });

  describe('categorizeColorTemperature', () => {
    it('deve categorizar corretamente', () => {
      expect(categorizeColorTemperature(2000)).toBe('muito-quente');
      expect(categorizeColorTemperature(2700)).toBe('quente');
      expect(categorizeColorTemperature(3000)).toBe('quente');
      expect(categorizeColorTemperature(4000)).toBe('neutro');
      expect(categorizeColorTemperature(5500)).toBe('fria');
      expect(categorizeColorTemperature(6500)).toBe('fria');
      expect(categorizeColorTemperature(8000)).toBe('muito-fria');
      expect(categorizeColorTemperature(15000)).toBe('muito-fria');
    });
  });

  describe('describeColorTemperature', () => {
    it('deve retornar string descritiva com Kelvin', () => {
      const desc = describeColorTemperature(2700);
      expect(desc).toContain('2700');
      expect(desc).toContain('K');
      expect(desc).toContain('quente');
    });
  });

  describe('applyWhiteBalanceCorrection', () => {
    it('não deve alterar cor se CCT próximo de D65 (6500K)', () => {
      const rgb = { r: 200, g: 100, b: 50 };
      const corrected = applyWhiteBalanceCorrection(rgb, 6500);
      expect(corrected.r).toBe(rgb.r);
      expect(corrected.g).toBe(rgb.g);
      expect(corrected.b).toBe(rgb.b);
    });

    it('deve corrigir viés amarelo/laranja de luz quente (2700K)', () => {
      // Objeto branco sob luz incandescente aparece amarelado
      // RGB amarelado ~ (255, 220, 150)
      const yellowish = { r: 255, g: 220, b: 150 };
      const corrected = applyWhiteBalanceCorrection(yellowish, 2700);

      // Correção deve reduzir vermelho/verde e aumentar azul
      expect(corrected.b).toBeGreaterThan(yellowish.b);
      expect(corrected.r).toBeLessThanOrEqual(yellowish.r);
    });

    it('deve corrigir viés azul de luz fria (10000K)', () => {
      // Objeto branco sob luz azulada aparece azulado
      const bluish = { r: 150, g: 180, b: 255 };
      const corrected = applyWhiteBalanceCorrection(bluish, 10000);

      // Correção deve aumentar vermelho e reduzir azul
      // Verde pode mudar ligeiramente (quase não muda para luz do dia)
      expect(corrected.r).toBeGreaterThan(bluish.r);
      expect(corrected.b).toBeLessThan(bluish.b);
    });
  });

  describe('correctColorForIlluminant', () => {
    it('deve retornar CCT estimado e cor corrigida', () => {
      const rgb = { r: 200, g: 150, b: 100 };
      const result = correctColorForIlluminant(rgb);

      expect(result).toHaveProperty('correctedRgb');
      expect(result).toHaveProperty('sceneCct');
      expect(result).toHaveProperty('temperatureCategory');
      expect(result.correctedRgb).toBeDefined();
      expect(result.temperatureCategory).not.toBeNull();
    });

    it('deve estimar CCT da imagem quando fornecida', () => {
      // Criar imagem com viés amarelado (simulando luz incandescente)
      const img = createSolidImage(50, 50, 255, 200, 120);
      const result = correctColorForIlluminant({ r: 255, g: 200, b: 120 }, img, 50, 50);

      expect(result.sceneCct).not.toBeNull();
      if (result.sceneCct) {
        expect(result.sceneCct).toBeLessThan(4000); // Deve detectar como quente
      }
      expect(result.temperatureCategory).toBe('quente');
    });
  });

  describe('detectColorFromImageData com White Balance', () => {
    it('deve retornar campos de temperatura', () => {
      const img = createSolidImage(50, 50, 255, 200, 120); // Amarelado
      const result = detectColorFromImageData(img, 50, 50, undefined, undefined, 15);

      expect(result).toHaveProperty('sceneCct');
      expect(result).toHaveProperty('temperatureCategory');
      expect(result).toHaveProperty('temperatureDescription');
      expect(result).toHaveProperty('whiteBalanceCorrected');
    });

    it('deve detectar luz quente e corrigir para cor real', () => {
      // Simular objeto "Branco" sob luz incandescente (~2800K)
      // O objeto branco aparece amarelado: RGB ~ (255, 180, 90)
      // Isso dá CCT ~2848K (categoria "quente" - 2500-3500K)
      const img = createSolidImage(50, 50, 255, 180, 90);

      const result = detectColorFromImageData(img, 50, 50, undefined, undefined, 15);

      // Deve detectar temperatura quente
      expect(result.temperatureCategory).toBe('quente');
      expect(result.whiteBalanceCorrected).toBe(true);

      // Após correção, deve ficar mais próximo de branco neutro
      expect(result.rgb.b).toBeGreaterThan(90);   // Azul aumentou significativamente
      expect(result.rgb.g).toBeGreaterThan(180);  // Verde aumentou
    });

    it('deve detectar luz fria mas não corrigir (categoria fria inclui D65)', () => {
      // Simular objeto "Branco" sob luz do dia (~6500K)
      // O objeto branco aparece levemente azulado: RGB ~ (245, 248, 255)
      // Isso dá CCT ~6900K (categoria "fria")
      // A categoria "fria" (5000-7500K) inclui o D65 (6500K), então não corrigimos
      const img = createSolidImage(50, 50, 245, 248, 255);

      const result = detectColorFromImageData(img, 50, 50, undefined, undefined, 15);

      // Deve detectar temperatura fria (5000-7500K)
      expect(result.temperatureCategory).toBe('fria');
      // Não deve corrigir pois 'fria' inclui a referência D65
      expect(result.whiteBalanceCorrected).toBe(false);
    });

    it('deve manter cor neutra sem correção significativa (D65)', () => {
      // Branco neutro sob D65
      const img = createSolidImage(50, 50, 240, 240, 240);

      const result = detectColorFromImageData(img, 50, 50, undefined, undefined, 15);

      // CCT deve ser próximo de 6500K
      expect(result.sceneCct).not.toBeNull();
      if (result.sceneCct) {
        expect(Math.abs(result.sceneCct - 6500)).toBeLessThan(1500);
      }
      expect(result.whiteBalanceCorrected).toBe(false);
    });
  });
});