/**
 * Textos falados pelos leitores de tela (TalkBack no Android, VoiceOver no iOS).
 *
 * Funções puras, sem dependência de React Native, para poderem ser testadas.
 * Regras seguidas:
 *  - sem emojis (o leitor de tela os lê pelo nome: "lâmpada", "alto-falante"...);
 *  - números sempre com a unidade por extenso ("50 por cento", não "50%");
 *  - decimais com vírgula, como se fala em português.
 */

import { UNCERTAIN_COLOR_NAME } from './color-stabilizer';

/** Texto mostrado enquanto a primeira cor ainda não foi lida. */
export const INITIALIZING_COLOR_NAME = 'Inicializando...';
/** Texto mostrado quando a câmera falha várias vezes seguidas. */
export const CAMERA_UNAVAILABLE_NAME = 'Câmera indisponível';

export type ValueUnit = 'percent' | 'pixels' | 'milliseconds' | 'multiplier' | 'none';

function decimalPtBr(value: number, fractionDigits?: number): string {
  const text = fractionDigits === undefined ? String(value) : value.toFixed(fractionDigits);
  return text.replace('.', ',');
}

/** Escreve um valor com a unidade por extenso, para ser falado. */
export function formatValueForSpeech(value: number, unit: ValueUnit): string {
  switch (unit) {
    case 'percent':
      return `${decimalPtBr(value)} por cento`;
    case 'pixels':
      return value === 1 ? '1 pixel' : `${decimalPtBr(value)} pixels`;
    case 'milliseconds':
      return value === 1 ? '1 milissegundo' : `${decimalPtBr(value)} milissegundos`;
    case 'multiplier':
      return `${decimalPtBr(value, 1)} vezes`;
    default:
      return decimalPtBr(value);
  }
}

/** Rótulo de uma opção de ajuste, ex.: "Sensibilidade de cores: 50 por cento". */
export function optionLabel(setting: string, value: number, unit: ValueUnit): string {
  return `${setting}: ${formatValueForSpeech(value, unit)}`;
}

/** Nome falado de cada preset da calibração. */
const PRESET_LABELS: Record<string, string> = {
  interior: 'Interior',
  exterior: 'Exterior',
  'low-light': 'Pouca luz',
};

export function presetLabel(presetKey: string): string {
  return PRESET_LABELS[presetKey] ?? presetKey;
}

/** Descreve o nível de luz com palavras (mais útil do que só um número). */
export function describeLightLevel(percent: number): string {
  const value = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  if (value < 10) return 'quase sem luz';
  if (value < 30) return 'pouca luz';
  if (value < 55) return 'luz moderada';
  if (value < 80) return 'bem iluminado';
  return 'muito claro';
}

/** Rótulo do painel de luz, ex.: "Intensidade de luz: 42 por cento, luz moderada". */
export function lightReadingLabel(percent: number, cameraFailed: boolean = false): string {
  if (cameraFailed) {
    return `${CAMERA_UNAVAILABLE_NAME}. Não foi possível medir a luz.`;
  }
  const rounded = Math.round(Number.isFinite(percent) ? percent : 0);
  return `Intensidade de luz: ${formatValueForSpeech(rounded, 'percent')}, ${describeLightLevel(rounded)}`;
}

/** Rótulo do painel de cor, ex.: "Cor detectada: Vermelho. Confiança de 90 por cento". */
export function colorReadingLabel(name: string, confidence: number): string {
  if (name === INITIALIZING_COLOR_NAME) {
    return 'Inicializando a leitura de cores';
  }
  if (name === CAMERA_UNAVAILABLE_NAME) {
    return `${CAMERA_UNAVAILABLE_NAME}. Não foi possível ler as cores.`;
  }
  if (name === UNCERTAIN_COLOR_NAME) {
    return `${UNCERTAIN_COLOR_NAME}. Aproxime a câmera do objeto ou melhore a iluminação.`;
  }
  const rounded = Math.round(Number.isFinite(confidence) ? confidence : 0);
  return `Cor detectada: ${name}. Confiança de ${formatValueForSpeech(rounded, 'percent')}`;
}
