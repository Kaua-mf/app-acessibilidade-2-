import 'package:flutter_tts/flutter_tts.dart';

import '../models/speech_settings.dart';

/// Serviço de síntese de fala (TTS). Anuncia cores, níveis de luz e avisos em pt-BR.
class TtsService {
  final FlutterTts _tts = FlutterTts();
  bool _initialized = false;

  Future<void> init() async {
    await _tts.setLanguage('pt-BR');
    await _tts.setSpeechRate(0.6); // taxa padrão (mapeada de rate 0.9)
    await _tts.setPitch(1.0);
    await _tts.setVolume(1.0);
    _initialized = true;
  }

  /// Aplica as configurações salvas do usuário.
  Future<void> applySettings(SpeechSettings settings) async {
    if (!_initialized) await init();
    // flutter_tts aceita speechRate de 0.0 a 1.0 (0.5 ≈ normal). Mapeia
    // o rate do app (0.5-2.0) para esse intervalo.
    final flutterRate = ((settings.rate - 0.5) / 1.5).clamp(0.0, 1.0);
    await _tts.setSpeechRate(flutterRate);
    await _tts.setPitch(settings.pitch.clamp(0.5, 2.0));
    await _tts.setVolume(settings.volume.clamp(0.0, 1.0));
    await _tts.setLanguage('pt-BR');
  }

  /// Fala um texto. Interrompe qualquer fala anterior.
  Future<void> speak(String text) async {
    if (!_initialized) await init();
    await _tts.stop();
    await _tts.speak(text);
  }

  /// Interrompe a fala em andamento.
  Future<void> stop() async {
    if (_initialized) await _tts.stop();
  }

  /// Libera recursos.
  Future<void> dispose() async {
    await stop();
    _initialized = false;
  }
}
