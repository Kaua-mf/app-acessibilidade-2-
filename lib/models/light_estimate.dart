/// Resultado da estimativa de luz.
enum LightSource { exifBrightness, exifExposure, pixels }

class LightEstimate {
  /// Nível de luz de 0 a 100 (escala logarítmica).
  final int percentage;

  /// De onde veio a estimativa.
  final LightSource source;

  /// EV100 estimado da cena (só quando veio do EXIF).
  final double? ev;

  const LightEstimate({
    required this.percentage,
    required this.source,
    this.ev,
  });
}
