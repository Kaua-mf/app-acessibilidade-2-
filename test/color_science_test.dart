import 'package:app_acessibilidade/logic/color_database.dart';
import 'package:app_acessibilidade/logic/color_science.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('srgbToLab / labToSrgb round trip', () {
    test('volta ao RGB original para cores puras', () {
      final red = const RgbColor(r: 255, g: 0, b: 0);
      final lab = srgbToLab(red);
      final back = labToSrgb(lab);
      expect(back.r, red.r);
      expect(back.g, red.g);
      expect(back.b, red.b);
    });
  });

  group('deltaE2000', () {
    test('cores idênticas dão zero', () {
      final lab = const LabColor(L: 50, a: 20, b: -30);
      expect(deltaE2000(lab, lab), 0);
    });

    test('preto vs branco dá delta E grande (~100)', () {
      final preto = const LabColor(L: 0, a: 0, b: 0);
      final branco = const LabColor(L: 100, a: 0, b: 0);
      expect(deltaE2000(preto, branco), closeTo(100, 1));
    });

    test('cores próximas dão delta E pequeno', () {
      final a = srgbToLab(const RgbColor(r: 255, g: 0, b: 0));
      final b = srgbToLab(const RgbColor(r: 250, g: 5, b: 5));
      expect(deltaE2000(a, b), lessThan(5));
    });
  });

  group('deltaE76', () {
    test('é simples e simétrico', () {
      final a = const LabColor(L: 40, a: 10, b: 20);
      final b = const LabColor(L: 50, a: 20, b: 30);
      expect(deltaE76(a, b), deltaE76(b, a));
      expect(deltaE76(a, a), 0);
    });
  });

  group('deltaEToConfidence', () {
    test('delta E <= 1 => 100% confiança', () {
      expect(deltaEToConfidence(0), 100);
      expect(deltaEToConfidence(1), 100);
    });

    test('cai conforme o delta E cresce', () {
      expect(deltaEToConfidence(2), lessThan(90));
      expect(deltaEToConfidence(5), lessThan(70));
      expect(deltaEToConfidence(100), greaterThanOrEqualTo(0));
    });
  });

  group('calculatePerceptualConfidence', () {
    test('2ª cor muito distante => não ambíguo', () {
      final result = calculatePerceptualConfidence(1.0, 10.0);
      expect(result.isAmbiguous, isFalse);
      expect(result.confidence, closeTo(100, 1));
    });

    test('2ª cor próxima => ambíguo', () {
      final result = calculatePerceptualConfidence(5.0, 6.0);
      expect(result.isAmbiguous, isTrue);
      expect(result.marginRatio, closeTo(1.2, 0.01));
    });

    test('delta E 1 zero => 100%', () {
      final result = calculatePerceptualConfidence(0, 10);
      expect(result.confidence, 100);
    });
  });

  group('findClosestDeltaE com base de cores', () {
    test('encontra vermelho puro na base', () {
      final redLab = srgbToLab(const RgbColor(r: 255, g: 0, b: 0));
      final lut = buildDeltaELut(colorLabs);
      final result = findClosestDeltaE(redLab, lut);
      final entry = colorDatabase[result.index];
      expect(entry.name, 'Vermelho');
      expect(result.deltaE, lessThan(1));
    });

    test('early exit para cor exatamente na base', () {
      final whiteLab = srgbToLab(const RgbColor(r: 255, g: 255, b: 255));
      final lut = buildDeltaELut(colorLabs);
      final result = findClosestDeltaE(whiteLab, lut, 1.0);
      expect(colorDatabase[result.index].name, 'Branco');
    });
  });

  group('findTopNClosest', () {
    test('retorna até N resultados ordenados', () {
      final lab = srgbToLab(const RgbColor(r: 255, g: 0, b: 0));
      final lut = buildDeltaELut(colorLabs);
      final top = findTopNClosest(lab, lut, 3);
      expect(top.length, 3);
      expect(top[0].deltaE, lessThanOrEqualTo(top[1].deltaE));
      expect(top[1].deltaE, lessThanOrEqualTo(top[2].deltaE));
    });
  });

  group('CCT e ponto branco', () {
    test('estimateCctFromXy branco dá cerca de 6500K', () {
      final cct = estimateCctFromXy(0.3127, 0.3290);
      expect(cct, isNotNull);
      expect(cct!, inInclusiveRange(5000, 8000));
    });

    test('coordenadas inválidas retornam null', () {
      expect(estimateCctFromXy(-0.1, 0.3), isNull);
      expect(estimateCctFromXy(0.5, 0.6), isNull); // x + y >= 1
    });

    test('categorizeColorTemperature faixas', () {
      expect(categorizeColorTemperature(2000), colorTemperatureMuitoQuente);
      expect(categorizeColorTemperature(3000), colorTemperatureQuente);
      expect(categorizeColorTemperature(4500), colorTemperatureNeutro);
      expect(categorizeColorTemperature(6000), colorTemperatureFria);
      expect(categorizeColorTemperature(9000), colorTemperatureMuitoFria);
    });

    test('whitePointFromCct próximo de D65 em 6500K', () {
      final wp = whitePointFromCct(6500);
      expect(wp.Y, 100);
      expect(wp.X, closeTo(95.047, 5));
    });
  });

  group('applyWhiteBalanceCorrection', () {
    test('não altera quando CCT próxima de D65', () {
      final rgb = const RgbColor(r: 100, g: 150, b: 200);
      expect(applyWhiteBalanceCorrection(rgb, 6500), rgb);
    });

    test('altera quando CCT distante', () {
      final rgb = const RgbColor(r: 200, g: 100, b: 50);
      final corrigida = applyWhiteBalanceCorrection(rgb, 2500);
      expect(corrigida, isNot(rgb));
    });
  });

  group('correctColorForIlluminant', () {
    test('sem imagem estima pelo próprio pixel', () {
      final result = correctColorForIlluminant(
        rgb: const RgbColor(r: 255, g: 200, b: 50),
      );
      expect(result.sceneCct, isNotNull);
      expect(result.temperatureCategory, isNotNull);
    });

    test('retorna cor inalterada quando CCT não estimável', () {
      // Não testável de forma determinística sem imagem; apenas garante que não lança.
      final result = correctColorForIlluminant(
        rgb: const RgbColor(r: 128, g: 128, b: 128),
      );
      expect(result.correctedRgb, const RgbColor(r: 128, g: 128, b: 128));
    });
  });

  group('colorConversionCache', () {
    test('retorna o mesmo Lab para o mesmo RGB', () {
      final cache = ColorConversionCache();
      final rgb = const RgbColor(r: 10, g: 20, b: 30);
      final a = srgbToLab(rgb);
      cache.set(rgb, a);
      expect(cache.get(rgb), a);
    });
  });
}
