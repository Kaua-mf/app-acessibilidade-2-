/**
 * Frame Sampling Utilities (funções puras, sem dependência de React Native)
 *
 * A câmera entrega uma foto JPEG grande. Em vez de decodificar a foto inteira
 * em JavaScript, o app reduz a imagem no código nativo para ~64 px de largura
 * e só então decodifica esta amostra pequena. As funções abaixo trabalham com
 * essa amostra.
 */

/** Largura (em pixels) da amostra reduzida que é decodificada em JavaScript. */
export const SAMPLE_WIDTH = 64;

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP: Record<string, number> = (() => {
  const table: Record<string, number> = {};
  for (let i = 0; i < BASE64_ALPHABET.length; i++) {
    table[BASE64_ALPHABET[i]] = i;
  }
  // Variante URL-safe, por garantia
  table['-'] = 62;
  table['_'] = 63;
  return table;
})();

/**
 * Converte base64 em bytes sem depender de Buffer ou atob
 * (o React Native não tem Buffer; o atob só existe em versões recentes).
 * Ignora espaços, quebras de linha e o prefixo "data:...;base64,".
 */
export function base64ToBytes(base64: string): Uint8Array {
  const commaIndex = base64.indexOf(',');
  const payload = base64.startsWith('data:') && commaIndex >= 0 ? base64.slice(commaIndex + 1) : base64;

  const values: number[] = [];
  for (let i = 0; i < payload.length; i++) {
    const char = payload[i];
    if (char === '=') break;
    const value = BASE64_LOOKUP[char];
    if (value !== undefined) {
      values.push(value);
    }
  }

  const bytes = new Uint8Array(Math.floor((values.length * 6) / 8));
  let buffer = 0;
  let bits = 0;
  let out = 0;
  for (let i = 0; i < values.length; i++) {
    buffer = (buffer << 6) | values[i];
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out++] = (buffer >> bits) & 0xff;
      buffer &= (1 << bits) - 1;
    }
  }
  return bytes;
}

/** Converte bytes em base64 (inverso de base64ToBytes). */
export function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;

    result += BASE64_ALPHABET[(triple >> 18) & 63];
    result += BASE64_ALPHABET[(triple >> 12) & 63];
    result += i + 1 < bytes.length ? BASE64_ALPHABET[(triple >> 6) & 63] : '=';
    result += i + 2 < bytes.length ? BASE64_ALPHABET[triple & 63] : '=';
  }
  return result;
}

/**
 * Converte o "tamanho da região" da calibração (5-50) no raio, em pixels,
 * da região média na amostra reduzida.
 *
 * Interpretação: regionSize é a metade do lado do quadrado central, em % do
 * lado menor da imagem. Com o padrão 20, o quadrado lido tem 40% do lado
 * menor, parecido com o tamanho da moldura na tela. Com 50, lê a imagem toda.
 */
export function regionRadiusFromSetting(regionSize: number, width: number, height: number): number {
  const clampedSize = Math.max(5, Math.min(50, regionSize));
  const shortSide = Math.min(width, height);
  return Math.max(1, Math.round((shortSide * clampedSize) / 100));
}
