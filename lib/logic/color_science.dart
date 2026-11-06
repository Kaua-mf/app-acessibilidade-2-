import 'dart:math';
import 'dart:typed_data';

/// Ponto branco de referência D65 (luz do dia padrão), XYZ com Y = 100.
class D65 {
  static const double x = 95.047;
  static const double y = 100.0;
  static const double z = 108.883;
}

/// Matriz sRGB → XYZ (D65) - IEC 61966-2-1:1999.
final List<List<double>> srgbToXyzMatrix = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
];

/// Matriz XYZ → sRGB (D65) - inversa da acima.
final List<List<double>> xyzToSrgbMatrix = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.9692660, 1.8760108, 0.0415560],
  [0.0556434, -0.2040259, 1.0572252],
];

const double _labDelta = 6 / 29;
// (29/3)^3 = 24389/27 ≈ 903.3
final double _labKappa = (29 * 29 * 29) / (27 * 27);
final double _labEpsilon = 216 / 24389; // (6/29)^3

/// Cor CIELAB.
class LabColor {
  final double L; // 0-100
  final double a; // ~ -128 a +128
  final double b; // ~ -128 a +128

  const LabColor({required this.L, required this.a, required this.b});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LabColor &&
          runtimeType == other.runtimeType &&
          L == other.L &&
          a == other.a &&
          b == other.b;

  @override
  int get hashCode => Object.hash(L, a, b);
}

/// Cor CIEXYZ (D65, escala 0-100).
class XyzColor {
  final double X;
  final double Y;
  final double Z;

  const XyzColor({required this.X, required this.Y, required this.Z});
}

/// Cor sRGB (0-255).
class RgbColor {
  final int r;
  final int g;
  final int b;

  const RgbColor({required this.r, required this.g, required this.b});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RgbColor &&
          runtimeType == other.runtimeType &&
          r == other.r &&
          g == other.g &&
          b == other.b;

  @override
  int get hashCode => Object.hash(r, g, b);
}

// ============================================================================
// Helpers de matemática (dart:math não tem cbrt nem hipot)
// ============================================================================

double _cbrt(double x) {
  if (x == 0) return 0;
  final negative = x < 0;
  return (negative ? -1.0 : 1.0) * pow(x.abs(), 1 / 3).toDouble();
}

double _hypot(double a, double b) => sqrt(a * a + b * b);

// ============================================================================
// Tabelas de conversão pré-computadas (performance)
// ============================================================================

/// sRGB (0-255) → Linear (0-1) - lookup table.
final Float32List srgbToLinearLut = Float32List(256)..setAll(
    0,
    List.generate(256, (i) {
      final c = i / 255;
      return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4).toDouble();
    }));

/// Linear (0-1) → sRGB (0-255) - lookup table.
final Uint8List linearToSrgbLut = Uint8List(1001)..setAll(
    0,
    List.generate(1001, (i) {
      final c = i / 1000;
      final srgb = c <= 0.0031308 ? 12.92 * c : 1.055 * pow(c, 1 / 2.4) - 0.055;
      return (srgb * 255).clamp(0, 255).round();
    }));

/// Lab L* (0-100) → f(t) para Delta E - lookup table.
final Float32List labFLut = Float32List(10001)..setAll(
    0,
    List.generate(10001, (i) {
      final t = i / 100;
      return t > _labEpsilon ? _cbrt(t) : (_labKappa * t + 16) / 116;
    }));

/// f(t) inverso para L* - lookup table.
final Float32List labFInvLut = Float32List(11601)..setAll(
    0,
    List.generate(11601, (i) {
      final ft = i / 100;
      return ft > _labDelta ? ft * ft * ft : (116 * ft - 16) / _labKappa;
    }));

// ============================================================================
// Conversões básicas (otimizadas com LUTs)
// ============================================================================

/// sRGB (0-255) → Linear RGB (0-1).
RgbLinear srgbToLinear(RgbColor rgb) {
  return RgbLinear(
    r: srgbToLinearLut[rgb.r],
    g: srgbToLinearLut[rgb.g],
    b: srgbToLinearLut[rgb.b],
  );
}

/// Linear RGB (0-1) → sRGB (0-255).
RgbColor linearToSrgb(RgbLinear linear) {
  double clamp(double v) => v.clamp(0.0, 1.0);
  int idx(double v) => (clamp(v) * 1000).round();
  return RgbColor(
    r: linearToSrgbLut[idx(linear.r)],
    g: linearToSrgbLut[idx(linear.g)],
    b: linearToSrgbLut[idx(linear.b)],
  );
}

/// Linear RGB (0-1) → XYZ (D65), XYZ em escala 0-100.
XyzColor linearRgbToXyz(RgbLinear linear) {
  final r = linear.r;
  final g = linear.g;
  final b = linear.b;
  return XyzColor(
    X: 100 *
        (r * srgbToXyzMatrix[0][0] +
            g * srgbToXyzMatrix[0][1] +
            b * srgbToXyzMatrix[0][2]),
    Y: 100 *
        (r * srgbToXyzMatrix[1][0] +
            g * srgbToXyzMatrix[1][1] +
            b * srgbToXyzMatrix[1][2]),
    Z: 100 *
        (r * srgbToXyzMatrix[2][0] +
            g * srgbToXyzMatrix[2][1] +
            b * srgbToXyzMatrix[2][2]),
  );
}

/// XYZ (D65, escala 0-100) → Linear RGB (0-1).
RgbLinear xyzToLinearRgb(XyzColor xyz) {
  final x = xyz.X / 100;
  final y = xyz.Y / 100;
  final z = xyz.Z / 100;
  return RgbLinear(
    r: x * xyzToSrgbMatrix[0][0] +
        y * xyzToSrgbMatrix[0][1] +
        z * xyzToSrgbMatrix[0][2],
    g: x * xyzToSrgbMatrix[1][0] +
        y * xyzToSrgbMatrix[1][1] +
        z * xyzToSrgbMatrix[1][2],
    b: x * xyzToSrgbMatrix[2][0] +
        y * xyzToSrgbMatrix[2][1] +
        z * xyzToSrgbMatrix[2][2],
  );
}

/// XYZ → CIELAB (D65).
LabColor xyzToLab(XyzColor xyz) {
  final xr = xyz.X / D65.x;
  final yr = xyz.Y / D65.y;
  final zr = xyz.Z / D65.z;

  final fx = xr > _labEpsilon ? _cbrt(xr) : (_labKappa * xr + 16) / 116;
  final fy = yr > _labEpsilon ? _cbrt(yr) : (_labKappa * yr + 16) / 116;
  final fz = zr > _labEpsilon ? _cbrt(zr) : (_labKappa * zr + 16) / 116;

  final l = 116 * fy - 16;
  final a = 500 * (fx - fy);
  final b = 200 * (fy - fz);

  return LabColor(
    L: l.clamp(0, 100),
    a: a,
    b: b,
  );
}

/// CIELAB → XYZ (D65).
XyzColor labToXyz(LabColor lab) {
  final fy = (lab.L + 16) / 116;
  final fx = lab.a / 500 + fy;
  final fz = fy - lab.b / 200;

  final xr = fx > _labDelta ? fx * fx * fx : (116 * fx - 16) / _labKappa;
  final yr = fy > _labDelta ? fy * fy * fy : (116 * fy - 16) / _labKappa;
  final zr = fz > _labDelta ? fz * fz * fz : (116 * fz - 16) / _labKappa;

  return XyzColor(
    X: xr * D65.x,
    Y: yr * D65.y,
    Z: zr * D65.z,
  );
}

/// sRGB (0-255) → CIELAB (D65) - pipeline completo otimizado.
LabColor srgbToLab(RgbColor rgb) {
  final linear = srgbToLinear(rgb);
  final xyz = linearRgbToXyz(linear);
  return xyzToLab(xyz);
}

/// CIELAB → sRGB (0-255) - pipeline completo otimizado.
RgbColor labToSrgb(LabColor lab) {
  final xyz = labToXyz(lab);
  final linear = xyzToLinearRgb(xyz);
  return linearToSrgb(linear);
}

// ============================================================================
// Delta E 2000 (CIEDE2000) - implementação completa
// ============================================================================

/// Calcula Delta E 2000 entre duas cores Lab.
///
/// Retorna ΔE₀₀: 0 = idênticas, <1 = imperceptível, 1-2 = limiar, >5 = óbvio.
double deltaE2000(LabColor lab1, LabColor lab2, [double kL = 1, double kC = 1, double kH = 1]) {
  final l1 = lab1.L;
  final a1 = lab1.a;
  final b1 = lab1.b;
  final l2 = lab2.L;
  final a2 = lab2.a;
  final b2 = lab2.b;

  // 1. Diferença de Lightness
  final deltaL = l2 - l1;
  final lmean = (l1 + l2) / 2;

  // 2. Chroma
  final c1 = _hypot(a1, b1);
  final c2 = _hypot(a2, b2);
  final cmean = (c1 + c2) / 2;

  // 3. Fator de correção de chroma (G)
  final cmean7 = pow(cmean, 7);
  final g = 0.5 * (1 - sqrt(cmean7 / (cmean7 + pow(25, 7))));

  // 4. Chroma corrigido
  final a1p = a1 * (1 + g);
  final a2p = a2 * (1 + g);
  final c1p = _hypot(a1p, b1);
  final c2p = _hypot(a2p, b2);
  final cmeanp = (c1p + c2p) / 2;
  final deltaCp = c2p - c1p;

  // 5. Ângulo de matiz (graus)
  final double h1p = c1p == 0 ? 0 : (atan2(b1, a1p) * 180 / pi + 360) % 360;
  final double h2p = c2p == 0 ? 0 : (atan2(b2, a2p) * 180 / pi + 360) % 360;

  // 6. Diferença de matiz
  var deltahp = h2p - h1p;
  if (c1p * c2p == 0) {
    deltahp = 0;
  } else if (deltahp > 180) {
    deltahp -= 360;
  } else if (deltahp < -180) {
    deltahp += 360;
  }
  final deltaHp = 2 * sqrt(c1p * c2p) * sin(deltahp * pi / 360);

  // 7. Matiz médio
  double hmeanp = 0;
  if (c1p * c2p == 0) {
    hmeanp = h1p + h2p;
  } else if ((h1p - h2p).abs() <= 180) {
    hmeanp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hmeanp = (h1p + h2p + 360) / 2;
  } else {
    hmeanp = (h1p + h2p - 360) / 2;
  }

  // 8. Fator de rotação (T)
  final hmeanpRad = hmeanp * pi / 180;
  final t = 1 -
      0.17 * cos(hmeanpRad - pi / 6) +
      0.24 * cos(2 * hmeanpRad) +
      0.32 * cos(3 * hmeanpRad + pi / 30) -
      0.20 * cos(4 * hmeanpRad - 63 * pi / 180);

  // 9. Fatores de escala (SL, SC, SH)
  final deltaLPrime = deltaL / kL;
  final deltaCpPrime = deltaCp / kC;
  final deltaHpPrime = deltaHp / kH;

  final lmean50 = lmean - 50;
  final lmean50sq = lmean50 * lmean50;

  final sl = 1 + (0.015 * lmean50sq) / sqrt(20 + lmean50sq);
  final sc = 1 + 0.045 * cmeanp;
  final sh = 1 + 0.015 * cmeanp * t;

  // 10. Fator de rotação RT
  final deltaTheta = 30 * exp(-pow((hmeanp - 275) / 25, 2));
  final cmeanp7 = pow(cmeanp, 7);
  final rc = 2 * sqrt(cmeanp7 / (cmeanp7 + pow(25, 7)));
  final rt = -rc * sin(2 * deltaTheta * pi / 180);

  // 11. Delta E 2000 final
  final termL = deltaLPrime / sl;
  final termC = deltaCpPrime / sc;
  final termH = deltaHpPrime / sh;

  return sqrt(termL * termL + termC * termC + termH * termH + rt * termC * termH);
}

/// Delta E 76 (CIE1976) - mais simples, para comparação/fallback.
double deltaE76(LabColor lab1, LabColor lab2) {
  final dL = lab2.L - lab1.L;
  final da = lab2.a - lab1.a;
  final db = lab2.b - lab1.b;
  return sqrt(dL * dL + da * da + db * db);
}

// ============================================================================
// Correção de balanço de branco (von Kries / Bradford)
// ============================================================================

/// Matriz Bradford para adaptação cromática (domínio dos cones).
final List<List<double>> bradfordMatrix = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296],
];

final List<List<double>> bradfordInverse = [
  [0.9869929, -0.1470543, 0.1599627],
  [0.4323053, 0.5183603, 0.0492912],
  [-0.0085287, 0.0400428, 0.9684867],
];

/// Aplica adaptação cromática von Kries (Bradford).
/// Converte XYZ do iluminante de origem para iluminante de destino.
XyzColor chromaticAdaptation(
  XyzColor xyz, {
  required XyzColor sourceWhite,
  XyzColor targetWhite = D65Color,
}) {
  List<double> xyzToLms(XyzColor xyz) => [
        bradfordMatrix[0][0] * xyz.X +
            bradfordMatrix[0][1] * xyz.Y +
            bradfordMatrix[0][2] * xyz.Z,
        bradfordMatrix[1][0] * xyz.X +
            bradfordMatrix[1][1] * xyz.Y +
            bradfordMatrix[1][2] * xyz.Z,
        bradfordMatrix[2][0] * xyz.X +
            bradfordMatrix[2][1] * xyz.Y +
            bradfordMatrix[2][2] * xyz.Z,
      ];

  final colorLms = xyzToLms(xyz);
  final sourceWhiteLms = xyzToLms(sourceWhite);
  final targetWhiteLms = xyzToLms(targetWhite);

  // Fatores de escala von Kries (diagonal no domínio dos cones)
  final scale = List.generate(3, (i) => targetWhiteLms[i] / sourceWhiteLms[i]);

  final adaptedLms = List.generate(3, (i) => colorLms[i] * scale[i]);

  return XyzColor(
    X: bradfordInverse[0][0] * adaptedLms[0] +
        bradfordInverse[0][1] * adaptedLms[1] +
        bradfordInverse[0][2] * adaptedLms[2],
    Y: bradfordInverse[1][0] * adaptedLms[0] +
        bradfordInverse[1][1] * adaptedLms[1] +
        bradfordInverse[1][2] * adaptedLms[2],
    Z: bradfordInverse[2][0] * adaptedLms[0] +
        bradfordInverse[2][1] * adaptedLms[1] +
        bradfordInverse[2][2] * adaptedLms[2],
  );
}

/// Ponto branco D65 como XyzColor.
const XyzColor D65Color = XyzColor(X: D65.x, Y: D65.y, Z: D65.z);

// ============================================================================
// Lookup table para Delta E rápido (performance)
// ============================================================================

class DeltaELutEntry {
  final LabColor lab;
  final int index;

  DeltaELutEntry({required this.lab, required this.index});
}

List<DeltaELutEntry> buildDeltaELut(List<LabColor> colorLabs) {
  return List.generate(
    colorLabs.length,
    (index) => DeltaELutEntry(lab: colorLabs[index], index: index),
  );
}

/// Busca a cor mais próxima usando Delta E 2000 com early exit.
/// Se encontrar distância < threshold, para imediatamente.
ClosestResult findClosestDeltaE(LabColor targetLab, List<DeltaELutEntry> lut,
    [double threshold = 1.0]) {
  var bestIndex = 0;
  var bestDeltaE = double.infinity;

  for (final entry in lut) {
    final dE = deltaE2000(targetLab, entry.lab);
    if (dE < bestDeltaE) {
      bestDeltaE = dE;
      bestIndex = entry.index;
      if (dE < threshold) break; // Early exit: imperceptível
    }
  }

  return ClosestResult(index: bestIndex, deltaE: bestDeltaE);
}

/// Busca top-N cores mais próximas (para alternativas/confiança).
List<ClosestResult> findTopNClosest(LabColor targetLab, List<DeltaELutEntry> lut, int n) {
  final results = <ClosestResult>[];
  for (final entry in lut) {
    results.add(ClosestResult(
      index: entry.index,
      deltaE: deltaE2000(targetLab, entry.lab),
    ));
  }
  results.sort((a, b) => a.deltaE.compareTo(b.deltaE));
  return results.take(n).toList();
}

class ClosestResult {
  final int index;
  final double deltaE;
  const ClosestResult({required this.index, required this.deltaE});
}

// ============================================================================
// Utilitários de confiança perceptual
// ============================================================================

/// Converte Delta E em confiança perceptual (0-100).
double deltaEToConfidence(double deltaE) {
  if (deltaE <= 1.0) return 100;
  if (deltaE <= 2.0) return 90 - 20 * (deltaE - 1.0);
  if (deltaE <= 5.0) return 70 - 40 * (deltaE - 2.0) / 3.0;
  return (30 - 30 * (deltaE - 5.0).clamp(0, 10.0) / 10.0).clamp(0, 30).roundToDouble();
}

/// Calcula confiança considerando a 2ª cor mais próxima (margem de ambiguidade).
PerceptualConfidence calculatePerceptualConfidence(double deltaE1, double deltaE2) {
  final baseConfidence = deltaEToConfidence(deltaE1);

  if (deltaE1 == 0) {
    return const PerceptualConfidence(confidence: 100, isAmbiguous: false, marginRatio: double.infinity);
  }

  final marginRatio = deltaE2 / deltaE1;

  // Se a 2ª cor está a menos de 1.5x a distância da 1ª → ambíguo
  final isAmbiguous = marginRatio < 1.5;

  // Penalizar confiança se ambíguo
  var confidence = baseConfidence;
  if (isAmbiguous) {
    // Reduzir linearmente de 100% (ratio=1.5) para 50% (ratio=1.0)
    final penalty = ((1.5 - marginRatio) / 0.5 * 0.5).clamp(0, 1);
    confidence = baseConfidence * (1 - penalty);
  }

  return PerceptualConfidence(
    confidence: confidence.clamp(0, 100).roundToDouble(),
    isAmbiguous: isAmbiguous,
    marginRatio: marginRatio,
  );
}

class PerceptualConfidence {
  final double confidence;
  final bool isAmbiguous;
  final double marginRatio;

  const PerceptualConfidence({
    required this.confidence,
    required this.isAmbiguous,
    required this.marginRatio,
  });
}

// ============================================================================
// Cache de conversões (para performance em loop de detecção)
// ============================================================================

/// Cache simples LRU para conversões RGB→Lab repetidas.
class ColorConversionCache {
  final Map<String, LabColor> _cache = {};
  final int maxSize;

  ColorConversionCache([this.maxSize = 256]);

  String _key(RgbColor rgb) => '${rgb.r},${rgb.g},${rgb.b}';

  LabColor? get(RgbColor rgb) => _cache[_key(rgb)];

  void set(RgbColor rgb, LabColor lab) {
    if (_cache.length >= maxSize) {
      // Remover primeira entrada (LRU simples)
      final firstKey = _cache.keys.first;
      _cache.remove(firstKey);
    }
    _cache[_key(rgb)] = lab;
  }

  void clear() => _cache.clear();
}

/// Instância global para uso no loop de detecção.
final colorConversionCache = ColorConversionCache(512);

/// sRGB → Lab com cache (para frames repetidos).
LabColor srgbToLabCached(RgbColor rgb) {
  final cached = colorConversionCache.get(rgb);
  if (cached != null) return cached;

  final lab = srgbToLab(rgb);
  colorConversionCache.set(rgb, lab);
  return lab;
}

/// Linear RGB (0-1).
class RgbLinear {
  final double r;
  final double g;
  final double b;

  const RgbLinear({required this.r, required this.g, required this.b});
}

// ============================================================================
// Temperatura de Cor Correlacionada (CCT) e ponto branco
// ============================================================================

/// Estima a Temperatura de Cor Correlacionada (CCT) em Kelvin a partir de
/// coordenadas cromáticas xy (CIE 1931). Aproximação de McCamy (1992).
/// Válida para ~2000K a ~20000K.
int? estimateCctFromXy(double x, double y) {
  if (x <= 0 || y <= 0 || x + y >= 1) return null;

  // n = (x - 0.3320) / (0.1858 - y)  -- McCamy
  final n = (x - 0.3320) / (0.1858 - y);

  // Polinômio de McCamy: CCT = 449*n³ + 3525*n² + 6823.3*n + 5520.33
  final cct = 449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33;

  if (cct < 1000 || cct > 25000) return null;

  return cct.round();
}

/// Estima CCT a partir de RGB linear (0-1).
int? estimateCctFromLinearRgb(RgbLinear linear) {
  final xyz = linearRgbToXyz(linear);
  final sum = xyz.X + xyz.Y + xyz.Z;
  if (sum == 0) return null;
  final x = xyz.X / sum;
  final y = xyz.Y / sum;
  return estimateCctFromXy(x, y);
}

/// Estima CCT a partir de sRGB (0-255).
int? estimateCctFromSrgb(RgbColor rgb) {
  final linear = srgbToLinear(rgb);
  return estimateCctFromLinearRgb(linear);
}

/// Estima CCT médio de uma imagem (média de pixels no centro).
int? estimateImageCct(
  Uint8List imageData, {
  required int width,
  required int height,
  int? centerX,
  int? centerY,
  int regionRadius = 30,
}) {
  final x = centerX ?? (width / 2).floor();
  final y = centerY ?? (height / 2).floor();

  final startX = x - regionRadius < 0 ? 0 : x - regionRadius;
  final endX = x + regionRadius > width ? width : x + regionRadius;
  final startY = y - regionRadius < 0 ? 0 : y - regionRadius;
  final endY = y + regionRadius > height ? height : y + regionRadius;

  var totalR = 0;
  var totalG = 0;
  var totalB = 0;
  var count = 0;

  for (var yy = startY; yy < endY; yy++) {
    for (var xx = startX; xx < endX; xx++) {
      final idx = (yy * width + xx) * 4;
      final alpha = imageData[idx + 3];
      if (alpha < 128) continue;
      totalR += imageData[idx];
      totalG += imageData[idx + 1];
      totalB += imageData[idx + 2];
      count++;
    }
  }

  if (count == 0) return null;

  final avgRgb = RgbColor(
    r: (totalR / count).round(),
    g: (totalG / count).round(),
    b: (totalB / count).round(),
  );

  return estimateCctFromSrgb(avgRgb);
}

/// Ponto branco (white point) XYZ para uma dada CCT (Kelvin).
/// Aproximação de Robertson (1968) / CIE 15:2004 para o locus do corpo negro.
XyzColor whitePointFromCct(double cct) {
  final t = cct.clamp(1667, 25000);

  double x, y;

  if (t <= 4000) {
    // Faixa 1667K - 4000K (tungstênio/incandescente) - Robertson
    final t2 = t * t;
    final t3 = t2 * t;
    x = -0.2661239 * 1e9 / t3 - 0.2343580 * 1e6 / t2 + 0.8776956 * 1e3 / t + 0.179910;
    y = -1.1063814 * x * x * x -
        1.3481102 * x * x +
        2.1855583 * x -
        0.20219683;
  } else if (t <= 7000) {
    // Faixa 4000K - 7000K - Robertson
    final t2 = t * t;
    final t3 = t2 * t;
    x = -3.0258469 * 1e9 / t3 + 2.1070379 * 1e6 / t2 + 0.2226347 * 1e3 / t + 0.240390;
    y = 3.0817580 * x * x * x -
        5.8733867 * x * x +
        3.7511299 * x -
        0.37001483;
  } else {
    // Faixa 7000K - 25000K - Aproximação CIE D-illuminant (Judd et al.)
    final invTk = 1000 / t;
    final invTk2 = invTk * invTk;
    final invTk3 = invTk2 * invTk;
    x = 0.244063 + 0.09911 * invTk + 2.9678 * invTk2 - 4.6070 * invTk3;
    y = -3.000 * x * x + 2.87 * x - 0.275;
  }

  // Garantir xy válidos (dentro do diagrama de cromaticidade CIE 1931)
  x = x.clamp(0.18, 0.45);
  y = y.clamp(0.15, 0.45);

  // Converter xy para XYZ (Y = 100)
  final yVal = 100.0;
  final xVal = (x / y) * yVal;
  final zVal = ((1 - x - y) / y) * yVal;

  return XyzColor(X: xVal, Y: yVal, Z: zVal);
}

/// Categoria perceptual da temperatura de cor.
typedef ColorTemperatureCategory = String;

const colorTemperatureMuitoQuente = 'muito-quente';
const colorTemperatureQuente = 'quente';
const colorTemperatureNeutro = 'neutro';
const colorTemperatureFria = 'fria';
const colorTemperatureMuitoFria = 'muito-fria';

String categorizeColorTemperature(int cct) {
  if (cct < 2500) return colorTemperatureMuitoQuente;
  if (cct < 3500) return colorTemperatureQuente;
  if (cct < 5000) return colorTemperatureNeutro;
  if (cct < 7500) return colorTemperatureFria;
  return colorTemperatureMuitoFria;
}

/// Descrição amigável da temperatura de cor para TTS/UI.
String describeColorTemperature(int cct) {
  const descriptions = {
    colorTemperatureMuitoQuente: 'luz muito quente (vela, nascer do sol)',
    colorTemperatureQuente: 'luz quente (incandescente, tungstênio)',
    colorTemperatureNeutro: 'luz neutra (manhã/tarde, fluorescente quente)',
    colorTemperatureFria: 'luz fria (luz do dia, flash, fluorescente frio)',
    colorTemperatureMuitoFria: 'luz muito fria (céu azul, sombra)',
  };
  return '${cct.round()} K — ${descriptions[categorizeColorTemperature(cct)]}';
}

/// Aplica correção de white balance (adaptação cromática) a uma cor RGB
/// baseada na temperatura de cor detectada da cena.
RgbColor applyWhiteBalanceCorrection(RgbColor rgb, int sceneCct) {
  // Se CCT é próximo de D65 (6500K), não precisa corrigir
  if ((sceneCct - 6500).abs() < 300) return rgb;

  final sceneWhite = whitePointFromCct(sceneCct.toDouble());

  // Pipeline: sRGB -> Linear -> XYZ -> Adaptação cromática (Bradford) -> XYZ -> Linear -> sRGB
  final linear = srgbToLinear(rgb);
  final xyz = linearRgbToXyz(linear);
  final adaptedXyz = chromaticAdaptation(xyz, sourceWhite: sceneWhite);
  final adaptedLinear = xyzToLinearRgb(adaptedXyz);
  return linearToSrgb(adaptedLinear);
}

/// Estima CCT e aplica correção de white balance em uma única chamada.
ColorCorrection correctColorForIlluminant({
  required RgbColor rgb,
  Uint8List? imageData,
  int? width,
  int? height,
  int? centerX,
  int? centerY,
  int? regionRadius,
}) {
  int? sceneCct;
  if (imageData != null && width != null && height != null) {
    sceneCct = estimateImageCct(
      imageData,
      width: width,
      height: height,
      centerX: centerX,
      centerY: centerY,
      regionRadius: regionRadius ?? 30,
    );
  }

  // Se não conseguiu estimar da imagem, tentar estimar do próprio pixel
  if (sceneCct == null) {
    sceneCct = estimateCctFromSrgb(rgb);
  }

  if (sceneCct == null) {
    return ColorCorrection(
      correctedRgb: rgb,
      sceneCct: null,
      temperatureCategory: null,
    );
  }

  final correctedRgb = applyWhiteBalanceCorrection(rgb, sceneCct);
  final temperatureCategory = categorizeColorTemperature(sceneCct);

  return ColorCorrection(
    correctedRgb: correctedRgb,
    sceneCct: sceneCct,
    temperatureCategory: temperatureCategory,
  );
}

class ColorCorrection {
  final RgbColor correctedRgb;
  final int? sceneCct;
  final String? temperatureCategory;

  const ColorCorrection({
    required this.correctedRgb,
    required this.sceneCct,
    required this.temperatureCategory,
  });
}
