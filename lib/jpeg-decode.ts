/**
 * Decodifica a pequena amostra JPEG (em base64) em pixels RGBA.
 * Fica separado de frame-sampling.ts para que as funções puras continuem
 * testáveis sem o jpeg-js.
 */

import { decode } from 'jpeg-js';

import { base64ToBytes } from './frame-sampling';

export interface DecodedFrame {
  /** Pixels em RGBA (4 bytes por pixel). */
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function decodeJpegBase64(base64: string): DecodedFrame {
  const bytes = base64ToBytes(base64);

  // useTArray: o React Native não tem Buffer, então pedimos Uint8Array
  const decoded = decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
    maxResolutionInMP: 4,
  }) as unknown as { width: number; height: number; data: Uint8Array };

  return {
    data: Uint8ClampedArray.from(decoded.data),
    width: decoded.width,
    height: decoded.height,
  };
}
