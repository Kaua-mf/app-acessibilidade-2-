import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;

import '../logic/frame_sampling.dart';

/// Uma amostra capturada da câmera, pronta para análise de pixels.
class CameraSample {
  /// Dados da imagem no formato RGBA (Uint8List).
  final Uint8List data;

  final int width;
  final int height;

  CameraSample({required this.data, required this.width, required this.height});
}

/// Wrapper sobre o plugin `camera`. Captura frames reduzidos e decodifica
/// apenas a amostra pequena (equivalente ao frame-capture.ts do original).
class CameraService {
  CameraController? _controller;
  CameraController? get controller => _controller;
  bool get isInitialized => _controller != null && _controller!.value.isInitialized;

  /// Inicializa a câmera na lente indicada (padrão: traseira).
  Future<void> init({CameraLensDirection direction = CameraLensDirection.back}) async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) {
      throw StateError('Nenhuma câmera disponível neste dispositivo.');
    }

    final camera = cameras.firstWhere(
      (c) => c.lensDirection == direction,
      orElse: () => cameras.first,
    );

    _controller = CameraController(
      camera,
      ResolutionPreset.low, // reduz o trabalho de decodificação
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );
    await _controller!.initialize();
  }

  /// Tira uma foto, reduz e decodifica só a amostra pequena (RGBA).
  Future<CameraSample> captureSample() async {
    if (_controller == null || !_controller!.value.isInitialized) {
      throw StateError('A câmera ainda não está disponível.');
    }

    final photo = await _controller!.takePicture();
    final bytes = await photo.readAsBytes();

    final image = img.decodeImage(bytes);
    if (image == null) {
      throw StateError('Não foi possível decodificar a imagem da câmera.');
    }

    // Reduz para ~sampleWidth de largura (mantém proporção), igual ao original
    final resized = img.copyResize(image, width: sampleWidth);

    final rgba = Uint8List(resized.width * resized.height * 4);
    var p = 0;
    for (var y = 0; y < resized.height; y++) {
      for (var x = 0; x < resized.width; x++) {
        final pixel = resized.getPixel(x, y);
        rgba[p++] = pixel.getChannel(img.Channel.red).toInt(); // R
        rgba[p++] = pixel.getChannel(img.Channel.green).toInt(); // G
        rgba[p++] = pixel.getChannel(img.Channel.blue).toInt(); // B
        rgba[p++] = pixel.getChannel(img.Channel.alpha).toInt(); // A
      }
    }

    return CameraSample(data: rgba, width: resized.width, height: resized.height);
  }

  /// Encerra a câmera e libera recursos.
  Future<void> dispose() async {
    await _controller?.dispose();
    _controller = null;
  }
}
