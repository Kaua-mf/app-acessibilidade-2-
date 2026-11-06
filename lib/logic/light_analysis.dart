import 'dart:typed_data';

import 'dart:math';

import '../models/light_estimate.dart';

double log2(double x) => log(x) / log(2);

/// Luminância linear (0-1) que a câmera costuma tentar obter (cinza médio).
const double middleGray = 0.18;

/// Quanto os pixels podem corrigir o EV vindo do EXIF (em stops).
const double maxPixelCorrectionEv = 4;

/// Tabela sRGB (0-255) -> luminância linear (0-1).
final Float32List srgbToLinear = Float32List(256)..setAll(
    0,
    List.generate(256, (i) {
      final c = i / 255;
      return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4).toDouble();
    }));

/// Luminância linear média (0-1) de uma imagem RGBA, com pesos Rec. 709.
/// Pixels quase transparentes são ignorados.
double meanLinearLuminance(Uint8List rgba) {
  var total = 0.0;
  var count = 0;
  for (var i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    total +=
        0.2126 * srgbToLinear[rgba[i] & 255] +
        0.7152 * srgbToLinear[rgba[i + 1] & 255] +
        0.0722 * srgbToLinear[rgba[i + 2] & 255];
    count++;
  }
  return count == 0 ? 0 : total / count;
}

/// Luminosidade percebida CIE L* (0-100) a partir da luminância linear (0-1).
double lightnessFromLuminance(double luminance) {
  final y = luminance.clamp(0.0, 1.0);
  final lStar = y <= 0.008856 ? 903.3 * y : 116 * cbrtHelper(y) - 16;
  return lStar.clamp(0.0, 100.0);
}

double cbrtHelper(double x) {
  if (x == 0) return 0;
  final negative = x < 0;
  return (negative ? -1.0 : 1.0) * pow(x.abs(), 1 / 3).toDouble();
}

/// Converte um EV100 estimado em porcentagem (0-100), em escala logarítmica.
double evToPercentage(double ev) {
  const evAt0Percent = 0;
  const evAt100Percent = 15;
  final fraction = (ev - evAt0Percent) / (evAt100Percent - evAt0Percent);
  return (fraction * 100).clamp(0, 100);
}

/// Lê um número de formatos variados: 0.033, "0.033", "1/30", [100], etc.
double? parseNumber(dynamic value) {
  if (value is List) {
    return value.isNotEmpty ? parseNumber(value.first) : null;
  }
  if (value is num) {
    return value.toDouble();
  }
  if (value is String) {
    final text = value.trim();
    final fraction = RegExp(r'^(-?\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)$').firstMatch(text);
    if (fraction != null) {
      final denominator = double.parse(fraction.group(2)!);
      return denominator == 0 ? null : double.parse(fraction.group(1)!) / denominator;
    }
    final parsed = double.tryParse(text);
    return parsed;
  }
  return null;
}

double? _pick(List<Map<String, dynamic>> sources, List<String> keys) {
  for (final source in sources) {
    for (final key in keys) {
      final parsed = parseNumber(source[key]);
      if (parsed != null) return parsed;
    }
  }
  return null;
}

class ExposureInfo {
  final double? exposureTime; // segundos
  final double? iso;
  final double? fNumber;
  final double? brightnessValue; // APEX Bv (iOS)

  ExposureInfo({this.exposureTime, this.iso, this.fNumber, this.brightnessValue});
}

/// Extrai os dados de exposição do EXIF devolvido pela câmera.
/// No iOS os campos costumam vir dentro de '{Exif}'; no Android, no nível raiz.
ExposureInfo parseExposureInfo(dynamic exif) {
  if (exif == null || exif is! Map) return ExposureInfo();

  final root = Map<String, dynamic>.from(exif);
  final sources = <Map<String, dynamic>>[root];
  for (final nestedKey in ['{Exif}', 'Exif']) {
    final nested = root[nestedKey];
    if (nested is Map) {
      sources.add(Map<String, dynamic>.from(nested));
    }
  }

  final exposureTime = _pick(sources, ['ExposureTime']);
  final iso = _pick(sources, ['ISOSpeedRatings', 'PhotographicSensitivity', 'ISO']);
  var fNumber = _pick(sources, ['FNumber']);
  if (fNumber == null) {
    final apertureValue = _pick(sources, ['ApertureValue']);
    if (apertureValue != null) {
      fNumber = pow(2, apertureValue / 2) as double;
    }
  }
  final brightnessValue = _pick(sources, ['BrightnessValue']);

  return ExposureInfo(
    exposureTime: exposureTime != null && exposureTime > 0 ? exposureTime : null,
    iso: iso != null && iso > 0 ? iso : null,
    fNumber: fNumber != null && fNumber > 0 ? fNumber : null,
    brightnessValue: brightnessValue,
  );
}

/// EV100 da exposição escolhida pela câmera: log2(N²/t) - log2(ISO/100).
double exposureEv100(double exposureTime, double iso, double fNumber) {
  return log2((fNumber * fNumber) / exposureTime) - log2(iso / 100);
}


/// Estima o nível de luz (0-100) de uma foto.
LightEstimate estimateLight(double meanLuminance, [dynamic exif]) {
  final info = parseExposureInfo(exif);

  // 1) iOS: o BrightnessValue (APEX) já é o brilho da cena. EV100 = Bv + 5.
  if (info.brightnessValue != null) {
    final ev = info.brightnessValue! + 5;
    return LightEstimate(
      percentage: evToPercentage(ev).round(),
      source: LightSource.exifBrightness,
      ev: ev,
    );
  }

  // 2) Exposição escolhida pela câmera, corrigida pelo brilho real dos pixels
  if (info.exposureTime != null &&
      info.iso != null &&
      info.fNumber != null) {
    final base = exposureEv100(info.exposureTime!, info.iso!, info.fNumber!);
    final luminance = (meanLuminance < 1e-4 ? 1e-4 : meanLuminance);
    final correction = log2(luminance / middleGray).clamp(-maxPixelCorrectionEv, maxPixelCorrectionEv);
    final ev = base + correction;
    return LightEstimate(
      percentage: evToPercentage(ev).round(),
      source: LightSource.exifExposure,
      ev: ev,
    );
  }

  // 3) Sem EXIF: luminosidade percebida dos pixels
  return LightEstimate(
    percentage: lightnessFromLuminance(meanLuminance).round(),
    source: LightSource.pixels,
  );
}

class LightSmoother {
  /// Suaviza um novo valor (média móvel exponencial).
  double smooth(double value) {
    current = current == null ? value : current! + weight * (value - current!);
    return current!;
  }

  void reset() => current = null;

  final double weight;
  double? current;

  LightSmoother({double alpha = 0.5}) : weight = alpha.clamp(0.05, 1.0);
}
