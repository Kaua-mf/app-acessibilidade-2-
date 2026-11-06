/// Configurações de calibração da detecção de cor. Persistidas em
/// SharedPreferences (equivalente ao AsyncStorage do app original).
class CalibrationSettings {
  /// 0-100. Quanto maior, mais estritas (mais leituras iguais seguidas para
  /// confirmar).
  final int colorSensitivity;

  /// 0-100. Confiança mínima percentual para nomear a cor.
  final int minConfidence;

  /// 5-50. Tamanho da região de leitura em % do lado menor da amostra.
  final int regionSize;

  /// 200-1000 ms. Intervalo entre leituras.
  final int updateFrequency;

  final String preset; // 'custom' | 'interior' | 'exterior' | 'low-light'

  const CalibrationSettings({
    required this.colorSensitivity,
    required this.minConfidence,
    required this.regionSize,
    required this.updateFrequency,
    required this.preset,
  });

  static const CalibrationSettings defaults = CalibrationSettings(
    colorSensitivity: 50,
    minConfidence: 70,
    regionSize: 20,
    updateFrequency: 500,
    preset: 'custom',
  );

  static const Map<String, CalibrationSettings> presets = {
    'interior': CalibrationSettings(
      colorSensitivity: 60,
      minConfidence: 65,
      regionSize: 25,
      updateFrequency: 500,
      preset: 'interior',
    ),
    'exterior': CalibrationSettings(
      colorSensitivity: 40,
      minConfidence: 75,
      regionSize: 15,
      updateFrequency: 300,
      preset: 'exterior',
    ),
    'low-light': CalibrationSettings(
      colorSensitivity: 80,
      minConfidence: 50,
      regionSize: 30,
      updateFrequency: 800,
      preset: 'low-light',
    ),
  };

  Map<String, dynamic> toJson() => {
        'colorSensitivity': colorSensitivity,
        'minConfidence': minConfidence,
        'regionSize': regionSize,
        'updateFrequency': updateFrequency,
        'preset': preset,
      };

  factory CalibrationSettings.fromJson(Map<String, dynamic> json) =>
      CalibrationSettings(
        colorSensitivity: json['colorSensitivity'] as int,
        minConfidence: json['minConfidence'] as int,
        regionSize: json['regionSize'] as int,
        updateFrequency: json['updateFrequency'] as int,
        preset: json['preset'] as String,
      );

  bool get isCustom => preset == 'custom';

  CalibrationSettings copyWith({
    int? colorSensitivity,
    int? minConfidence,
    int? regionSize,
    int? updateFrequency,
    String? preset,
  }) {
    return CalibrationSettings(
      colorSensitivity: colorSensitivity ?? this.colorSensitivity,
      minConfidence: minConfidence ?? this.minConfidence,
      regionSize: regionSize ?? this.regionSize,
      updateFrequency: updateFrequency ?? this.updateFrequency,
      preset: preset ?? this.preset,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CalibrationSettings &&
          runtimeType == other.runtimeType &&
          colorSensitivity == other.colorSensitivity &&
          minConfidence == other.minConfidence &&
          regionSize == other.regionSize &&
          updateFrequency == other.updateFrequency &&
          preset == other.preset;

  @override
  int get hashCode =>
      Object.hash(colorSensitivity, minConfidence, regionSize, updateFrequency, preset);

  /// Texto descritivo da calibração atual (para a UI/TTS).
  String get description {
    switch (preset) {
      case 'interior':
        return 'Calibrado para ambientes internos com iluminação artificial';
      case 'exterior':
        return 'Calibrado para ambientes externos com luz natural';
      case 'low-light':
        return 'Calibrado para ambientes com baixa iluminação';
      default:
        return 'Calibração personalizada (Sensibilidade: $colorSensitivity por cento)';
    }
  }
}
