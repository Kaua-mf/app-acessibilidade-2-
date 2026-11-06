import 'package:app_acessibilidade/services/audio_service.dart';
import 'package:app_acessibilidade/services/camera_service.dart';
import 'package:app_acessibilidade/services/tts_service.dart';

/// Service locator simples: um único ponto de acesso aos serviços do app
/// (TTS, áudio/apito, câmera), usado pelas telas.
class AppServices {
  static final AppServices instance = AppServices._internal();
  factory AppServices() => instance;
  AppServices._internal();

  final TtsService tts = TtsService();
  final AudioService audio = AudioService();
  final CameraService camera = CameraService();

  Future<void> init() async {
    await tts.init();
    try {
      await camera.init();
    } catch (e) {
      print('Câmera não disponível nesta plataforma: $e');
    }
  }

  Future<void> dispose() async {
    await tts.dispose();
    await audio.dispose();
    await camera.dispose();
  }
}
