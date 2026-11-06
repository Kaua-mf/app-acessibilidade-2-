import 'dart:math';
import 'dart:typed_data';

import 'package:app_acessibilidade/models/color_data.dart';
import 'package:app_acessibilidade/logic/color_database.dart';
import 'package:app_acessibilidade/logic/color_science.dart';

/// Resultado da detecção de uma cor a partir de dados de imagem.
typedef ColorDetectResult = ColorData;

PixelData _getPixelAt(Uint8List imageData, int x, int y, int width) {
  final index = (y * width + x) * 4;
  return PixelData(
    r: imageData[index],
    g: imageData[index + 1],
    b: imageData[index + 2],
    a: imageData[index + 3],
  );
}

/// Média de pixels em uma região quadrada (para detecção mais estável).
/// Ignora pixels transparentes (alpha < 128).
PixelData _averagePixelsInRegion(
  Uint8List imageData,
  int centerX,
  int centerY,
  int width,
  int height, {
  int regionSize = 20,
}) {
  var totalR = 0;
  var totalG = 0;
  var totalB = 0;
  var count = 0;

  final startX = (centerX - regionSize).clamp(0, width - 1);
  final endX = (centerX + regionSize).clamp(0, width - 1);
  final startY = (centerY - regionSize).clamp(0, height - 1);
  final endY = (centerY + regionSize).clamp(0, height - 1);

  for (var y = startY; y <= endY; y++) {
    for (var x = startX; x <= endX; x++) {
      final pixel = _getPixelAt(imageData, x, y, width);
      if (pixel.a > 128) {
        totalR += pixel.r;
        totalG += pixel.g;
        totalB += pixel.b;
        count++;
      }
    }
  }

  if (count == 0) {
    return const PixelData(r: 128, g: 128, b: 128, a: 255);
  }

  return PixelData(
    r: (totalR / count).round(),
    g: (totalG / count).round(),
    b: (totalB / count).round(),
    a: 255,
  );
}

/// Encontra as N cores mais próximas usando Delta E 2000.
List<MapEntry<ColorEntry, double>> _findClosestColorsPerceptual(RgbColor rgb, [int n = 3]) {
  final lab = srgbToLabCached(rgb);
  final results = findTopNClosest(lab, colorDeltaELut, n);

  return results.map((result) {
    final entry = colorDatabase[result.index];
    return MapEntry(entry, result.deltaE);
  }).toList();
}

/// Converte RGB para HSL (mantido para compatibilidade com a UI existente).
MapEntry<double, MapEntry<double, double>> rgbToHsl(int r, int g, int b) {
  final rf = r / 255;
  final gf = g / 255;
  final bf = b / 255;

  final max = rf > gf ? (rf > bf ? rf : bf) : (gf > bf ? gf : bf);
  final min = rf < gf ? (rf < bf ? rf : bf) : (gf < bf ? gf : bf);
  var h = 0.0;
  var s = 0.0;
  final l = (max + min) / 2;

  if (max != min) {
    final d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max == rf) {
      h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6;
    } else if (max == gf) {
      h = ((bf - rf) / d + 2) / 6;
    } else {
      h = ((rf - gf) / d + 4) / 6;
    }
  }

  return MapEntry(
    (h * 360).round().toDouble(),
    MapEntry((s * 100).round().toDouble(), (l * 100).round().toDouble()),
  );
}

/// Extrai pixel em coordenadas específicas.
class PixelData {
  final int r;
  final int g;
  final int b;
  final int a;

  const PixelData({required this.r, required this.g, required this.b, required this.a});
}

/// LUT pré-construída para busca rápida de Delta E.
final List<DeltaELutEntry> colorDeltaELut = buildDeltaELut(colorLabs);

/**
 * Detecta cor a partir de dados de imagem (RGBA).
 *
 * @param imageData - Dados brutos da imagem (formato RGBA)
 * @param width - Largura da imagem
 * @param height - Altura da imagem
 * @param centerX - Coordenada X do centro (padrão: centro da imagem)
 * @param centerY - Coordenada Y do centro (padrão: centro da imagem)
 * @param regionRadius - Meio-lado do quadrado de média, em pixels (padrão: 15)
 * @returns Dados da cor com nome, hex, RGB, HSL, confiança, alternativas e info de temperatura
 */
ColorData detectColorFromImageData(
  Uint8List imageData, {
  required int width,
  required int height,
  int? centerX,
  int? centerY,
  int regionRadius = 15,
}) {
  // Usar centro da imagem se coordenadas não fornecidas
  final x = centerX ?? (width / 2).floor();
  final y = centerY ?? (height / 2).floor();

  // Média de pixels na região para detecção mais estável
  final avgPixel = _averagePixelsInRegion(
    imageData,
    x,
    y,
    width,
    height,
    regionSize: regionRadius,
  );

  final rgb = RgbColor(r: avgPixel.r, g: avgPixel.g, b: avgPixel.b);

  // Aplicar correção de white balance baseada na temperatura de cor da cena (SEMPRE ATIVO)
  final correction = correctColorForIlluminant(
    rgb: rgb,
    imageData: imageData,
    width: width,
    height: height,
    centerX: x,
    centerY: y,
    regionRadius: max(15, regionRadius * 2), // Região maior para estimar CCT
  );
  final sceneCct = correction.sceneCct;
  final temperatureCategory = correction.temperatureCategory;

  // Calcular saturação para detectar se é um objeto colorido vs iluminante
  final maxVal = rgb.r > rgb.g ? (rgb.r > rgb.b ? rgb.r : rgb.b) : (rgb.g > rgb.b ? rgb.g : rgb.b);
  final minVal = rgb.r < rgb.g ? (rgb.r < rgb.b ? rgb.r : rgb.b) : (rgb.g < rgb.b ? rgb.g : rgb.b);
  final saturation = maxVal > 0 ? (maxVal - minVal) / maxVal : 0;

  // Só aplicar white balance se a temperatura indica um color cast significativo
  // em relação ao D65 (6500K). Não corrigir para 'neutro' (3500-5000K) e 'fria' (5000-7500K)
  // pois 'fria' inclui o próprio D65 (6500K - luz de referência).
  // Corrigir apenas para: 'muito-quente', 'quente', 'muito-fria'.
  final shouldCorrect =
      temperatureCategory == colorTemperatureMuitoQuente ||
          temperatureCategory == colorTemperatureQuente ||
          temperatureCategory == colorTemperatureMuitoFria;

  final whiteBalanceCorrected = shouldCorrect && saturation < 0.7;

  // Usar RGB corrigido apenas se o white balance foi realmente aplicado
  final correctedRgb = whiteBalanceCorrected ? correction.correctedRgb : rgb;

  // Buscar top 3 cores mais próximas perceptualmente (usando RGB corrigido)
  final closest = _findClosestColorsPerceptual(correctedRgb, 3);

  if (closest.isEmpty) {
    // Fallback improvável (base não vazia)
    final hsl = rgbToHsl(correctedRgb.r, correctedRgb.g, correctedRgb.b);
    return ColorData(
      name: 'Desconhecida',
      hex: '#808080',
      r: correctedRgb.r,
      g: correctedRgb.g,
      b: correctedRgb.b,
      h: hsl.key,
      s: hsl.value.key,
      l: hsl.value.value,
      confidence: 0,
      alternatives: [],
      isAmbiguous: false,
      sceneCct: sceneCct,
      temperatureCategory: temperatureCategory,
      temperatureDescription: sceneCct != null ? describeColorTemperature(sceneCct) : null,
      whiteBalanceCorrected: whiteBalanceCorrected,
    );
  }

  final best = closest.first;
  final secondBest = closest.length > 1 ? closest[1].value : double.infinity;

  // Calcular confiança perceptual com margem para 2ª cor
  final conf = calculatePerceptualConfidence(best.value, secondBest);

  // Converter para HSL (compatibilidade) - usar RGB corrigido
  final hsl = rgbToHsl(correctedRgb.r, correctedRgb.g, correctedRgb.b);

  // Preparar alternativas para TTS/UI (top 3, exceto a melhor)
  final alternatives = closest.skip(1).map((pair) {
    final entry = pair.key;
    final deltaE = pair.value;
    return ColorAlternative(
      name: entry.name,
      hex: entry.hex,
      confidence: deltaEToConfidence(deltaE),
    );
  }).toList();

  return ColorData(
    name: best.key.name,
    hex: best.key.hex,
    r: correctedRgb.r,
    g: correctedRgb.g,
    b: correctedRgb.b,
    h: hsl.key,
    s: hsl.value.key,
    l: hsl.value.value,
    confidence: conf.confidence,
    alternatives: alternatives,
    isAmbiguous: conf.isAmbiguous,
    sceneCct: sceneCct,
    temperatureCategory: temperatureCategory,
    temperatureDescription: sceneCct != null ? describeColorTemperature(sceneCct) : null,
    whiteBalanceCorrected: whiteBalanceCorrected,
  );
}

/**
 * Converte hex para RGB.
 */
RgbColor? hexToRgb(String hex) {
  final result = RegExp(r'^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$', caseSensitive: false)
      .firstMatch(hex);
  if (result == null) return null;
  return RgbColor(
    r: int.parse(result.group(1)!, radix: 16),
    g: int.parse(result.group(2)!, radix: 16),
    b: int.parse(result.group(3)!, radix: 16),
  );
}

/**
 * Converte RGB para hex.
 */
String rgbToHex(int r, int g, int b) {
  return '#${[r, g, b].map((x) {
    final hex = x.toRadixString(16);
    return hex.length == 1 ? '0$hex' : hex;
  }).join().toUpperCase()}';
}

/**
 * Limpa o cache de conversão (útil para testes ou troca de iluminante).
 */
void clearColorCache() {
  colorConversionCache.clear();
}

/**
 * Obtém entrada completa da base por nome.
 */
ColorEntry? getColorEntryByName(String name) {
  return colorDatabase.firstWhere(
    (c) => c.name.toLowerCase() == name.toLowerCase(),
    orElse: () => throw StateError('Cor não encontrada: $name'),
  );
}
