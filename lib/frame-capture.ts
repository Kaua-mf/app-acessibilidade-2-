/**
 * Captura uma amostra da câmera: tira a foto (sem som de obturador), reduz no
 * código nativo para ~64 px de largura e decodifica só essa amostra pequena.
 * Assim nunca decodificamos em JavaScript uma foto de vários megapixels.
 *
 * Os arquivos temporários são apagados a cada captura.
 */

import type { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { SAMPLE_WIDTH } from './frame-sampling';
import { decodeJpegBase64, type DecodedFrame } from './jpeg-decode';

export interface CapturedSample extends DecodedFrame {
  /** EXIF da foto original (só quando includeExif é true e o aparelho fornece). */
  exif?: unknown;
}

export interface CaptureOptions {
  /** Pede o EXIF da foto (usado pela detecção de luz). */
  includeExif?: boolean;
}

async function removeTemporaryFile(uri: string | undefined): Promise<void> {
  // Na web a "uri" é um data URL, não há arquivo para apagar
  if (!uri || !uri.startsWith('file:')) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Arquivo temporário: se não der para apagar, o sistema limpa o cache depois
  }
}

export async function captureSample(
  camera: CameraView,
  options: CaptureOptions = {}
): Promise<CapturedSample> {
  let photoUri: string | undefined;
  let sampleUri: string | undefined;

  try {
    const photo = await camera.takePictureAsync({
      quality: 0.3,
      skipProcessing: true, // mais rápido; a orientação não importa para o centro da imagem
      shutterSound: false,
      exif: options.includeExif === true,
      base64: false,
    });
    if (!photo) {
      throw new Error('A câmera não devolveu a foto.');
    }
    photoUri = photo.uri;

    const context = ImageManipulator.manipulate(photo.uri);
    context.resize({ width: SAMPLE_WIDTH });
    const image = await context.renderAsync();
    const sample = await image.saveAsync({ base64: true, format: SaveFormat.JPEG, compress: 0.9 });
    sampleUri = sample.uri;

    if (!sample.base64) {
      throw new Error('A amostra reduzida veio sem dados.');
    }

    return { ...decodeJpegBase64(sample.base64), exif: photo.exif };
  } finally {
    await removeTemporaryFile(photoUri);
    await removeTemporaryFile(sampleUri);
  }
}
