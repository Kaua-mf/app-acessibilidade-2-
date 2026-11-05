/**
 * Contrato do gerador de apito. Há duas implementações, escolhidas pelo Metro
 * conforme a plataforma:
 *  - tone-player.ts         → web (Web Audio API) e testes
 *  - tone-player.native.ts  → Android e iOS (expo-audio + arquivos WAV)
 */
export interface TonePlayer {
  /** Começa a tocar um tom contínuo. */
  start(frequency: number, volume: number): void;
  /** Muda a frequência do tom que está tocando. */
  setFrequency(frequency: number): void;
  /** Muda o volume (0-1). */
  setVolume(volume: number): void;
  /** Para o tom contínuo. */
  stop(): void;
  /** Toca um bipe curto. */
  beep(frequency: number, durationMs: number, volume: number): void;
  /** Para tudo e libera os recursos de áudio. */
  dispose(): void;
  /** Se o tom contínuo está ativo. */
  isPlaying(): boolean;
}
