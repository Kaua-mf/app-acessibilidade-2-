/// Estabilizador de cor.
///
/// Evita que o app fique falando "Verde, Verde Claro, Verde..." quando a leitura
/// oscila entre cores parecidas. Um nome só é confirmado depois de aparecer N
/// vezes seguidas e só é confirmado de novo se for diferente do último.

/// Texto exibido e falado quando a confiança da leitura é menor que a mínima.
const uncertainColorName = 'Cor incerta';

/// Quantas leituras iguais seguidas confirmam uma cor, a partir da
/// "sensibilidade" da calibração (0-100).
/// 70 ou mais: 1 leitura. 40 ou mais: 2 leituras. Menos que isso: 3 leituras.
int framesFromSensitivity(int sensitivity) {
  if (sensitivity >= 70) return 1;
  if (sensitivity >= 40) return 2;
  return 3;
}

/// Retorna true se a leitura tem confiança suficiente para ser nomeada.
bool isConfidentEnough(double confidence, double minConfidence) =>
    confidence >= minConfidence;

abstract class ColorStabilizer {
  /// Registra uma leitura. Retorna o nome quando ele acaba de ser confirmado
  /// (novo e estável), ou null caso contrário.
  String? push(String name);

  /// Atualiza quantas leituras seguidas são necessárias.
  void setRequiredFrames(int frames);

  /// Esquece o histórico (a próxima cor estável será confirmada de novo).
  void reset();
}

ColorStabilizer createColorStabilizer([int requiredFrames = 2]) {
  var required = requiredFrames.clamp(1, 100).toInt();
  String? candidate;
  var streak = 0;
  String? confirmed;

  return _ColorStabilizerImpl(
    push: (name) {
      if (name == candidate) {
        streak++;
      } else {
        candidate = name;
        streak = 1;
      }

      if (streak >= required && name != confirmed) {
        confirmed = name;
        return name;
      }
      return null;
    },
    setRequiredFrames: (frames) {
      required = frames.clamp(1, 100).toInt();
    },
    reset: () {
      candidate = null;
      streak = 0;
      confirmed = null;
    },
  );
}

class _ColorStabilizerImpl implements ColorStabilizer {
  final String? Function(String name) _pushFn;
  final void Function(int frames) _setRequiredFramesFn;
  final void Function() _resetFn;

  @override
  String? push(String name) => _pushFn(name);

  @override
  void setRequiredFrames(int frames) => _setRequiredFramesFn(frames);

  @override
  void reset() => _resetFn();

  _ColorStabilizerImpl({
    required String? Function(String name) push,
    required void Function(int frames) setRequiredFrames,
    required void Function() reset,
  }) : _pushFn = push,
       _setRequiredFramesFn = setRequiredFrames,
       _resetFn = reset;
}
