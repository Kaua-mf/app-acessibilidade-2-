/// Configurações de síntese de fala (TTS). Persistidas em SharedPreferences.
class SpeechSettings {
  /// 0.5-2.0. Taxa de fala.
  final double rate;

  /// 0.5-2.0. Tom da voz.
  final double pitch;

  /// 0-1. Volume.
  final double volume;

  /// Se a fala está ativada.
  final bool enabled;

  const SpeechSettings({
    required this.rate,
    required this.pitch,
    required this.volume,
    required this.enabled,
  });

  static const SpeechSettings defaults = SpeechSettings(
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,
    enabled: true,
  );

  Map<String, dynamic> toJson() => {
        'rate': rate,
        'pitch': pitch,
        'volume': volume,
        'enabled': enabled,
      };

  factory SpeechSettings.fromJson(Map<String, dynamic> json) => SpeechSettings(
        rate: (json['rate'] as num).toDouble(),
        pitch: (json['pitch'] as num).toDouble(),
        volume: (json['volume'] as num).toDouble(),
        enabled: json['enabled'] as bool? ?? true,
      );

  SpeechSettings copyWith({
    double? rate,
    double? pitch,
    double? volume,
    bool? enabled,
  }) {
    return SpeechSettings(
      rate: rate ?? this.rate,
      pitch: pitch ?? this.pitch,
      volume: volume ?? this.volume,
      enabled: enabled ?? this.enabled,
    );
  }

  bool get isValid =>
      rate >= 0.5 && rate <= 2.0 &&
      pitch >= 0.5 && pitch <= 2.0 &&
      volume >= 0.0 && volume <= 1.0;

  /// Descrição da taxa de fala (ex.: 'Normal', 'Rápido').
  String get rateDescription {
    if (rate < 0.7) return 'Muito Lento';
    if (rate < 0.85) return 'Lento';
    if (rate < 1.0) return 'Normal';
    if (rate < 1.2) return 'Rápido';
    return 'Muito Rápido';
  }

  /// Descrição do tom da voz (ex.: 'Grave', 'Agudo').
  String get pitchDescription {
    if (pitch < 0.8) return 'Grave';
    if (pitch <= 1.0) return 'Normal';
    if (pitch < 1.3) return 'Agudo';
    return 'Muito Agudo';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SpeechSettings &&
          runtimeType == other.runtimeType &&
          rate == other.rate &&
          pitch == other.pitch &&
          volume == other.volume &&
          enabled == other.enabled;

  @override
  int get hashCode => Object.hash(rate, pitch, volume, enabled);
}
