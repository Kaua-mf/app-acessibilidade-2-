/**
 * Color Stabilizer
 *
 * Evita que o app fique falando "Verde, Verde Claro, Verde..." quando a leitura
 * oscila entre cores parecidas. Um nome só é confirmado depois de aparecer
 * N vezes seguidas e só é confirmado de novo se for diferente do último.
 */

/** Texto exibido e falado quando a confiança da leitura é menor que a mínima. */
export const UNCERTAIN_COLOR_NAME = 'Cor incerta';

/**
 * Quantas leituras iguais seguidas confirmam uma cor, a partir da
 * "sensibilidade" da calibração (0-100).
 * 70 ou mais: 1 leitura. 40 ou mais: 2 leituras. Menos que isso: 3 leituras.
 */
export function framesFromSensitivity(sensitivity: number): number {
  if (sensitivity >= 70) return 1;
  if (sensitivity >= 40) return 2;
  return 3;
}

/** Retorna true se a leitura tem confiança suficiente para ser nomeada. */
export function isConfidentEnough(confidence: number, minConfidence: number): boolean {
  return confidence >= minConfidence;
}

export interface ColorStabilizer {
  /**
   * Registra uma leitura. Retorna o nome quando ele acaba de ser confirmado
   * (novo e estável), ou null caso contrário.
   */
  push(name: string): string | null;
  /** Atualiza quantas leituras seguidas são necessárias. */
  setRequiredFrames(frames: number): void;
  /** Esquece o histórico (a próxima cor estável será confirmada de novo). */
  reset(): void;
}

export function createColorStabilizer(requiredFrames: number = 2): ColorStabilizer {
  let required = Math.max(1, Math.floor(requiredFrames));
  let candidate: string | null = null;
  let streak = 0;
  let confirmed: string | null = null;

  return {
    push(name: string): string | null {
      if (name === candidate) {
        streak++;
      } else {
        candidate = name;
        streak = 1;
      }

      if (streak >= required && name !== confirmed) {
        confirmed = name;
        return name;
      }
      return null;
    },

    setRequiredFrames(frames: number): void {
      required = Math.max(1, Math.floor(frames));
    },

    reset(): void {
      candidate = null;
      streak = 0;
      confirmed = null;
    },
  };
}
