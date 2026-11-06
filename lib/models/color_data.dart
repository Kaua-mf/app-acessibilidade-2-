/// Modelo alternativo de cor (top-N) usado para mostrar opções próximas
/// quando a detecção é ambígua.
class ColorAlternative {
  final String name;
  final String hex;
  final double confidence;

  const ColorAlternative({
    required this.name,
    required this.hex,
    required this.confidence,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'hex': hex,
        'confidence': confidence,
      };

  factory ColorAlternative.fromJson(Map<String, dynamic> json) => ColorAlternative(
        name: json['name'] as String,
        hex: json['hex'] as String,
        confidence: (json['confidence'] as num).toDouble(),
      );
}

/// Resultado da detecção de uma cor.
class ColorData {
  final String name;
  final String hex;
  final int r;
  final int g;
  final int b;
  final double h;
  final double s;
  final double l;
  final double confidence;
  final List<ColorAlternative> alternatives;
  final bool isAmbiguous;
  final int? sceneCct;
  final String? temperatureCategory;
  final String? temperatureDescription;
  final bool whiteBalanceCorrected;

  const ColorData({
    required this.name,
    required this.hex,
    required this.r,
    required this.g,
    required this.b,
    required this.h,
    required this.s,
    required this.l,
    required this.confidence,
    this.alternatives = const [],
    this.isAmbiguous = false,
    this.sceneCct,
    this.temperatureCategory,
    this.temperatureDescription,
    this.whiteBalanceCorrected = false,
  });

  /// Cor "inicializando" — exibida antes da primeira leitura.
  static ColorData initializing() => const ColorData(
        name: 'Inicializando...',
        hex: '#808080',
        r: 128,
        g: 128,
        b: 128,
        h: 0,
        s: 0,
        l: 50,
        confidence: 0,
      );

  /// Cor exibida quando a câmera falha.
  static ColorData cameraUnavailable() => const ColorData(
        name: 'Câmera indisponível',
        hex: '#808080',
        r: 128,
        g: 128,
        b: 128,
        h: 0,
        s: 0,
        l: 50,
        confidence: 0,
      );

  /// Cor incerta (confiança abaixo do mínimo).
  static ColorData uncertain() => const ColorData(
        name: 'Cor incerta',
        hex: '#808080',
        r: 128,
        g: 128,
        b: 128,
        h: 0,
        s: 0,
        l: 50,
        confidence: 0,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'hex': hex,
        'r': r,
        'g': g,
        'b': b,
        'h': h,
        's': s,
        'l': l,
        'confidence': confidence,
        'alternatives': alternatives.map((a) => a.toJson()).toList(),
        'isAmbiguous': isAmbiguous,
        'sceneCct': sceneCct,
        'temperatureCategory': temperatureCategory,
        'temperatureDescription': temperatureDescription,
        'whiteBalanceCorrected': whiteBalanceCorrected,
      };

  factory ColorData.fromJson(Map<String, dynamic> json) => ColorData(
        name: json['name'] as String,
        hex: json['hex'] as String,
        r: json['r'] as int,
        g: json['g'] as int,
        b: json['b'] as int,
        h: (json['h'] as num).toDouble(),
        s: (json['s'] as num).toDouble(),
        l: (json['l'] as num).toDouble(),
        confidence: (json['confidence'] as num).toDouble(),
        alternatives: (json['alternatives'] as List? ?? [])
            .map((e) => ColorAlternative.fromJson(e as Map<String, dynamic>))
            .toList(),
        isAmbiguous: json['isAmbiguous'] as bool? ?? false,
        sceneCct: json['sceneCct'] as int?,
        temperatureCategory: json['temperatureCategory'] as String?,
        temperatureDescription: json['temperatureDescription'] as String?,
        whiteBalanceCorrected: json['whiteBalanceCorrected'] as bool? ?? false,
      );
}
