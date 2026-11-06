import 'dart:math';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';

/// Gerador de apito de frequência variável (feedback sonoro da detecção de luz).
///
/// Gera um WAV com tom senoidal e reproduz em loop; quando a frequência muda
/// significativamente, recria o áudio na nova frequência.
class AudioService {
  static const int _sampleRate = 44100;
  static const int _durationMs = 700; // duração de cada segmento; loopado
  static const int _fadeMs = 60;      // fade-in/out para evitar estalos

  final AudioPlayer _player = AudioPlayer();
  double _currentFrequency = -1;
  bool _playing = false;

  /// Inicia (ou reinicia com nova frequência) o apito contínuo.
  Future<void> playWhistle(double frequency, double volume) async {
    final freq = frequency.round();
    if (_playing && (_currentFrequency - freq).abs() < 8) {
      // mesma frequência: mantém tocando
      return;
    }
    await stop();
    _currentFrequency = freq.toDouble();
    final wav = _generateSineWav(freq.toDouble(), _durationMs, volume);
    await _player.setReleaseMode(ReleaseMode.loop);
    await _player.play(BytesSource(wav));
    _playing = true;
  }

  /// Para o apito.
  Future<void> stop() async {
    try {
      await _player.stop();
    } catch (_) {}
    _playing = false;
  }

  /// Libera recursos de áudio.
  Future<void> dispose() async {
    await stop();
    await _player.release();
  }

  /// Gera um arquivo WAV (PCM 16-bit mono) com um tom senoidal.
  Uint8List _generateSineWav(double frequencyHz, int durationMs, double volume) {
    final samples = (_sampleRate * durationMs ~/ 1000).clamp(1, _sampleRate * 10);
    final fadeSamples = (_sampleRate * _fadeMs ~/ 1000).clamp(0, samples ~/ 2);
    final dataLength = samples * 2; // 16-bit mono = 2 bytes por amostra
    final fileSize = 36 + dataLength;

    final bytes = <int>[];

    // RIFF header
    bytes.addAll('RIFF'.codeUnits);
    bytes.addAll(_int32LE(fileSize));       // file size - 8
    bytes.addAll('WAVE'.codeUnits);

    // fmt sub-chunk
    bytes.addAll('fmt '.codeUnits);
    bytes.addAll(_int32LE(16));             // sub-chunk size
    bytes.addAll(_int16LE(1));              // audio format = PCM
    bytes.addAll(_int16LE(1));              // channels = 1
    bytes.addAll(_int32LE(_sampleRate));    // sample rate
    bytes.addAll(_int32LE(_sampleRate * 1 * 2)); // byte rate
    bytes.addAll(_int16LE(1 * 2));          // block align
    bytes.addAll(_int16LE(16));             // bits per sample

    // data sub-chunk
    bytes.addAll('data'.codeUnits);
    bytes.addAll(_int32LE(dataLength));

    final v = volume.clamp(0.0, 1.0);
    final twoPi = 2 * 3.141592653589793;

    for (var i = 0; i < samples; i++) {
      final t = i / _sampleRate;
      var sample = sin(twoPi * frequencyHz * t);

      // fade-in / fade-out
      var fade = 1.0;
      if (i < fadeSamples) fade = i / fadeSamples;
      if (samples - i < fadeSamples) fade = (samples - i) / fadeSamples;
      if (fadeSamples == 0) fade = 1.0;

      sample = (sample * v * fade * 0.7).clamp(-1.0, 1.0);
      final pcm = (sample * 32767).round().clamp(-32768, 32767);
      bytes.addAll(_int16LE(pcm));
    }

    return Uint8List.fromList(bytes);
  }

  static List<int> _int16LE(int value) {
    final v = value.clamp(-32768, 32767);
    return [v & 0xFF, (v >> 8) & 0xFF];
  }

  static List<int> _int32LE(int value) {
    return [
      value & 0xFF,
      (value >> 8) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 24) & 0xFF,
    ];
  }
}

/// Converte nível de luz (0-100) em frequência (200-2000 Hz).
/// Luz baixa = frequência grave; luz alta = frequência aguda.
double lightPercentageToFrequency(double lightPercentage) {
  final clamped = lightPercentage.clamp(0.0, 100.0);
  const minFreq = 200.0;
  const maxFreq = 2000.0;
  final normalized = clamped / 100.0;
  final frequency = minFreq * pow(maxFreq / minFreq, normalized);
  return frequency.roundToDouble();
}
