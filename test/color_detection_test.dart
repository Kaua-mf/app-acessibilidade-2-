import 'dart:typed_data';

import 'package:app_acessibilidade/logic/color_detection.dart';
import 'package:app_acessibilidade/models/color_data.dart';
import 'package:flutter_test/flutter_test.dart';

/// Cria uma imagem RGBA preenchida com uma cor sólida.
Uint8List _solidImage(int r, int g, int b, {int width = 64, int height = 64}) {
  final data = Uint8List(width * height * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return data;
}

void main() {
  group('detectColorFromImageData', () {
    test('vermelho puro detecta Vermelho com alta confiança', () {
      final data = _solidImage(255, 0, 0);
      final result = detectColorFromImageData(data, width: 64, height: 64);
      expect(result.name, 'Vermelho');
      expect(result.confidence, greaterThanOrEqualTo(90));
      expect(result.hex, '#FF0000');
      expect(result.r, 255);
      expect(result.g, 0);
      expect(result.b, 0);
    });

    test('verde puro detecta Verde', () {
      final data = _solidImage(0, 128, 0);
      final result = detectColorFromImageData(data, width: 64, height: 64);
      expect(result.name, 'Verde');
      expect(result.confidence, greaterThanOrEqualTo(90));
    });

    test('azul puro detecta Azul', () {
      final data = _solidImage(0, 0, 255);
      final result = detectColorFromImageData(data, width: 64, height: 64);
      expect(result.name, 'Azul');
      expect(result.confidence, greaterThanOrEqualTo(90));
    });

    test('preto detecta Preto', () {
      final data = _solidImage(0, 0, 0);
      final result = detectColorFromImageData(data, width: 64, height: 64);
      expect(result.name, 'Preto');
    });

    test('branco detecta Branco', () {
      final data = _solidImage(255, 255, 255);
      final result = detectColorFromImageData(data, width: 64, height: 64);
      expect(result.name, 'Branco');
    });

    test('cinza médio detecta Cinza', () {
      final data = _solidImage(128, 128, 128);
      final result = detectColorFromImageData(data, width: 64, height: 64);
      expect(result.name, 'Cinza');
    });

    test('amarelo puro detecta Amarelo', () {
      final data = _solidImage(255, 255, 0);
      final result = detectColorFromImageData(data, width: 64, height: 64);
      // 'Amarelo' e 'Amarelo Limão' compartilham o mesmo hex #FFFF00 na base
      expect(result.name, contains('Amarelo'));
      expect(result.confidence, greaterThanOrEqualTo(90));
    });

    test('retorna hsl e alternativas', () {
      final data = _solidImage(255, 0, 0);
      final result = detectColorFromImageData(data, width: 64, height: 64);
      expect(result.h, greaterThanOrEqualTo(0));
      expect(result.h, lessThanOrEqualTo(360));
      expect(result.alternatives, hasLength(2));
      expect(result.whiteBalanceCorrected, isFalse);
    });

    test('região personalizada funciona', () {
      final data = _solidImage(0, 255, 0, width: 100, height: 100);
      final result = detectColorFromImageData(
        data,
        width: 100,
        height: 100,
        centerX: 50,
        centerY: 50,
        regionRadius: 10,
      );
      expect(result.name, contains('Verde'));
    });
  });

  group('hexToRgb / rgbToHex', () {
    test('round trip', () {
      final rgb = hexToRgb('#ff00aa');
      expect(rgb?.r, 255);
      expect(rgb?.g, 0);
      expect(rgb?.b, 170);
      expect(rgbToHex(255, 0, 170), '#FF00AA');
    });

    test('hex invalido retorna null', () {
      expect(hexToRgb('not-a-color'), isNull);
      expect(hexToRgb('#GG0000'), isNull);
    });
  });

  group('ColorData factory', () {
    test('inicializando', () {
      final d = ColorData.initializing();
      expect(d.name, 'Inicializando...');
      expect(d.confidence, 0);
    });

    test('camera indisponível', () {
      final d = ColorData.cameraUnavailable();
      expect(d.name, 'Câmera indisponível');
    });

    test('incerta', () {
      final d = ColorData.uncertain();
      expect(d.name, 'Cor incerta');
    });
  });
}
