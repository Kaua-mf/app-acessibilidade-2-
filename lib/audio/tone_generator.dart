import 'dart:math';
import 'dart:typed_data';

/// Gera um arquivo WAV em memória com um tom senoide (sine wave) de
/// determinada frequência e duração. Usado para o "apito" da detecção de luz.
class ToneGenerator {
  static const int _sampleRate = 44100;
  static const int _bitsPerSample = 16;
  static const int _channels = 1;

  /// Escreve um UInt32 em little endian no buffer.
  static void _writeUint32LE(Uint8List buffer, int offset, int value) {
    buffer[offset] = value & 0xFF;
    buffer[offset + 1] = (value >> 8) & 0xFF;
    buffer[offset + 2] = (value >> 16) & 0xFF;
    buffer[offset + 3] = (value >> 24) & 0xFF;
  }

  /// Escreve um UInt32 em big endian no buffer.
  static void _writeUint32BE(Uint8List buffer, int offset, int value) {
    buffer[offset] = (value >> 24) & 0xFF;
    buffer[offset + 1] = (value >> 16) & 0xFF;
    buffer[offset + 2] = (value >> 8) & 0xFF;
    buffer[offset + 3] = value & 0xFF;
  }

  /// Escreve um UInt16 em little endian no buffer.
  static void _writeUint16LE(Uint8List buffer, int offset, int value) {
    buffer[offset] = value & 0xFF;
    buffer[offset + 1] = (value >> 8) & 0xFF;
  }

  /// Escreve um Int16 em little endian no buffer.
  static void _writeInt16LE(Uint8List buffer, int offset, int value) {
    value = value.clamp(-32768, 32767);
    if (value < 0) value = 65536 + value;
    buffer[offset] = value & 0xFF;
    buffer[offset + 1] = (value >> 8) & 0xFF;
  }

  /// Gera bytes WAV de um tom senoide.
  ///
  /// [frequency] em Hz (ex: 200 = grave, 2000 = agudo)
  /// [durationMs] duração em milissegundos (será tocado em loop)
  static Uint8List generateSineWave(double frequency, {int durationMs = 500}) {
    final sampleCount = (_sampleRate * durationMs ~/ 1000);
    final bytesPerSample = _bitsPerSample ~/ 8;
    final blockAlign = _channels * bytesPerSample;
    final byteRate = _sampleRate * blockAlign;
    final dataSize = sampleCount * blockAlign;
    final fileSize = 36 + dataSize;

    final buffer = Uint8List(44 + dataSize);

    // ----- RIFF header -----
    // "RIFF" (big endian ASCII)
    buffer[0] = 0x52; // 'R'
    buffer[1] = 0x49; // 'I'
    buffer[2] = 0x46; // 'F'
    buffer[3] = 0x46; // 'F'
    _writeUint32LE(buffer, 4, fileSize - 8);
    // "WAVE" (big endian ASCII)
    buffer[8] = 0x57; // 'W'
    buffer[9] = 0x41; // 'A'
    buffer[10] = 0x56; // 'V'
    buffer[11] = 0x45; // 'E'

    // ----- fmt chunk -----
    // "fmt " (big endian ASCII)
    buffer[12] = 0x66; // 'f'
    buffer[13] = 0x6D; // 'm'
    buffer[14] = 0x74; // 't'
    buffer[15] = 0x20; // ' '
    _writeUint32LE(buffer, 16, 16); // tamanho do fmt
    _writeUint16LE(buffer, 20, 1); // PCM
    _writeUint16LE(buffer, 22, _channels);
    _writeUint32LE(buffer, 24, _sampleRate);
    _writeUint32LE(buffer, 28, byteRate);
    _writeUint16LE(buffer, 32, blockAlign);
    _writeUint16LE(buffer, 34, _bitsPerSample);

    // ----- data chunk -----
    // "data" (big endian ASCII)
    buffer[36] = 0x64; // 'd'
    buffer[37] = 0x61; // 'a'
    buffer[38] = 0x74; // 't'
    buffer[39] = 0x61; // 'a'
    _writeUint32LE(buffer, 40, dataSize);

    // ----- amostras PCM 16-bit -----
    final amplitude = 0.7 * 32767;
    var offset = 44;
    for (var i = 0; i < sampleCount; i++) {
      final t = i / _sampleRate;
      final value = (amplitude * sin(2 * pi * frequency * t)).round();
      _writeInt16LE(buffer, offset, value);
      offset += bytesPerSample;
    }

    return buffer;
  }
}
