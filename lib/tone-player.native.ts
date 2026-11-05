/**
 * Gerador de apito para Android e iOS.
 *
 * O React Native não tem Web Audio API, então o apito é tocado pelo expo-audio
 * (já instalado no projeto, funciona no Expo Go) a partir de pequenos arquivos
 * WAV em loop, um para cada passo de frequência (veja wav-tone.ts). Os arquivos
 * são gerados na primeira vez que cada tom é usado e ficam no cache do app.
 *
 * Limitação: a frequência muda em degraus de ~1,7 semitom e, ao trocar de
 * degrau, o expo-audio recarrega o arquivo, o que pode causar uma pausa
 * mínima. Para um tom contínuo e sem degraus seria preciso uma biblioteca com
 * osciladores nativos (ex.: react-native-audio-api), que exige development
 * build e não roda no Expo Go.
 */

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

import type { TonePlayer } from './tone-player.types';
import { frequencyToToneStep, generateToneWavBase64, toneStepFrequency } from './wav-tone';

// Mude o sufixo se o formato dos arquivos mudar, para não reaproveitar o cache antigo
const FILE_PREFIX = 'whistle-v1-';

async function ensureToneFile(step: number): Promise<string> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error('Diretório de cache indisponível.');
  }

  const uri = `${directory}${FILE_PREFIX}${step}.wav`;
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.writeAsStringAsync(uri, generateToneWavBase64(toneStepFrequency(step)), {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  return uri;
}

export function createTonePlayer(): TonePlayer {
  let player: AudioPlayer | null = null;
  let loadedStep = -1;

  // Estado desejado; sync() leva o player até ele
  let wantPlaying = false;
  let wantStep = 0;
  let wantVolume = 0.3;

  let working = false;
  let again = false;
  let disposed = false;
  let audioModeConfigured = false;
  let beepTimer: ReturnType<typeof setTimeout> | null = null;

  const clampVolume = (volume: number) => Math.max(0, Math.min(1, volume));

  // Só uma sincronização por vez; pedidos que chegam no meio viram uma nova volta
  const sync = async (): Promise<void> => {
    if (working) {
      again = true;
      return;
    }
    working = true;
    try {
      do {
        again = false;
        if (disposed) return;

        if (!audioModeConfigured) {
          audioModeConfigured = true;
          try {
            // iOS: tocar mesmo com o botão de silencioso ligado
            await setAudioModeAsync({ playsInSilentMode: true });
          } catch (error) {
            console.warn('Não foi possível configurar o modo de áudio:', error);
          }
        }

        if (!wantPlaying) {
          player?.pause();
          continue;
        }

        const step = wantStep;
        let justLoaded = false;
        if (!player || step !== loadedStep) {
          const uri = await ensureToneFile(step);
          if (disposed) return;
          if (!player) {
            player = createAudioPlayer({ uri });
          } else {
            player.replace({ uri });
          }
          player.loop = true;
          loadedStep = step;
          justLoaded = true;
        }

        player.volume = wantVolume;
        if (justLoaded || !player.playing) {
          player.play();
        }
      } while (again);
    } catch (error) {
      console.warn('Erro ao tocar o apito:', error);
    } finally {
      working = false;
    }
  };

  return {
    start(frequency, volume) {
      disposed = false;
      wantPlaying = true;
      wantStep = frequencyToToneStep(frequency);
      wantVolume = clampVolume(volume);
      void sync();
    },

    setFrequency(frequency) {
      wantStep = frequencyToToneStep(frequency);
      if (wantPlaying) void sync();
    },

    setVolume(volume) {
      wantVolume = clampVolume(volume);
      if (wantPlaying) void sync();
    },

    stop() {
      wantPlaying = false;
      void sync();
    },

    beep(frequency, durationMs, volume) {
      // Bipe = tom curto no mesmo player (o app não usa bipes hoje)
      if (beepTimer) clearTimeout(beepTimer);
      this.start(frequency, volume);
      beepTimer = setTimeout(() => {
        beepTimer = null;
        this.stop();
      }, durationMs);
    },

    dispose() {
      disposed = true;
      wantPlaying = false;
      if (beepTimer) {
        clearTimeout(beepTimer);
        beepTimer = null;
      }
      try {
        player?.remove();
      } catch (error) {
        console.warn('Erro ao liberar o player de áudio:', error);
      }
      player = null;
      loadedStep = -1;
    },

    isPlaying() {
      return wantPlaying;
    },
  };
}
