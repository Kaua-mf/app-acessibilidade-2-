/// Textos falados pelos leitores de tela (TalkBack no Android, VoiceOver no iOS)
/// e síntese de fala do app. Regras:
///  - sem emojis (o leitor de tela os lê pelo nome);
///  - números sempre com a unidade por extenso ("50 por cento", não "50%");
///  - decimais com vírgula, como se fala em português.

const initializingColorName = 'Inicializando...';
const cameraUnavailableName = 'Câmera indisponível';
const uncertainColorName = 'Cor incerta';

typedef ValueUnit = String;

const valueUnitPercent = 'percent';
const valueUnitPixels = 'pixels';
const valueUnitMilliseconds = 'milliseconds';
const valueUnitMultiplier = 'multiplier';
const valueUnitNone = 'none';

String _decimalPtBr(double value, [int? fractionDigits]) {
  final text = fractionDigits == null ? value.toString() : value.toStringAsFixed(fractionDigits);
  return text.replaceAll('.', ',');
}

/// Escreve um valor com a unidade por extenso, para ser falado.
String formatValueForSpeech(double value, String unit) {
  switch (unit) {
    case valueUnitPercent:
      return '${_decimalPtBr(value)} por cento';
    case valueUnitPixels:
      return value == 1 ? '1 pixel' : '${_decimalPtBr(value)} pixels';
    case valueUnitMilliseconds:
      return value == 1 ? '1 milissegundo' : '${_decimalPtBr(value)} milissegundos';
    case valueUnitMultiplier:
      return '${_decimalPtBr(value, 1)} vezes';
    default:
      return _decimalPtBr(value);
  }
}

/// Rótulo de uma opção de ajuste, ex.: "Sensibilidade de cores: 50 por cento".
String optionLabel(String setting, double value, String unit) =>
    '$setting: ${formatValueForSpeech(value, unit)}';

/// Nome falado de cada preset da calibração.
final Map<String, String> presetLabels = {
  'interior': 'Interior',
  'exterior': 'Exterior',
  'low-light': 'Pouca luz',
};

String presetLabel(String presetKey) => presetLabels[presetKey] ?? presetKey;

/// Descreve o nível de luz com palavras (mais útil do que só um número).
String describeLightLevel(double percent) {
  final value = percent.isFinite ? percent.clamp(0, 100) : 0;
  if (value < 10) return 'quase sem luz';
  if (value < 30) return 'pouca luz';
  if (value < 55) return 'luz moderada';
  if (value < 80) return 'bem iluminado';
  return 'muito claro';
}

/// Rótulo do painel de luz, ex.: "Intensidade de luz: 42 por cento, luz moderada".
String lightReadingLabel(double percent, [bool cameraFailed = false]) {
  if (cameraFailed) {
    return '$cameraUnavailableName. Não foi possível medir a luz.';
  }
  final rounded = percent.round();
  return 'Intensidade de luz: ${formatValueForSpeech(rounded.toDouble(), valueUnitPercent)}, ${describeLightLevel(rounded.toDouble())}';
}

/// Rótulo do painel de cor, ex.: "Cor detectada: Vermelho. Confiança de 90 por cento".
String colorReadingLabel(String name, double confidence) {
  if (name == initializingColorName) {
    return 'Inicializando a leitura de cores';
  }
  if (name == cameraUnavailableName) {
    return '$cameraUnavailableName. Não foi possível ler as cores.';
  }
  if (name == uncertainColorName) {
    return '$uncertainColorName. Aproxime a câmera do objeto ou melhore a iluminação.';
  }
  final rounded = confidence.round();
  return 'Cor detectada: $name. Confiança de ${formatValueForSpeech(rounded.toDouble(), valueUnitPercent)}';
}
