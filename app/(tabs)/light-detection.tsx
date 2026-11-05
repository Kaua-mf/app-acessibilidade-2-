import React, { useState, useRef, useEffect } from 'react';
import { AccessibilityInfo, View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { lightReadingLabel, formatValueForSpeech, describeLightLevel } from '@/lib/accessibility-labels';
import { useScreenReaderEnabled } from '@/lib/use-screen-reader';
import { captureSample } from '@/lib/frame-capture';
import {
  createLightSmoother,
  estimateLight,
  meanLinearLuminance,
  LightEstimate,
} from '@/lib/light-analysis';
import {
  playLightDetectionWhistle,
  stopWhistle,
  cleanup,
  lightPercentageToFrequency,
} from '@/lib/audio-synthesis';

const LIGHT_UPDATE_INTERVAL_MS = 500;
const WHISTLE_VOLUME = 0.3;
// Depois de tantas falhas seguidas, avisa que a câmera não está funcionando
const MAX_CONSECUTIVE_FAILURES = 5;
const CAMERA_UNAVAILABLE_TEXT = 'Câmera indisponível';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function LightDetectionScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [lightPercentage, setLightPercentage] = useState<number>(0);
  const [hasReading, setHasReading] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [cameraFailed, setCameraFailed] = useState<boolean>(false);
  const [isWhistleActive, setIsWhistleActive] = useState<boolean>(true);
  const [lightSource, setLightSource] = useState<LightEstimate['source']>('pixels');
  const cameraRef = useRef<CameraView>(null);
  const screenReaderEnabled = useScreenReaderEnabled();
  // Em ref: o laço de leitura sempre usa o valor mais recente, sem precisar reiniciar
  const screenReaderRef = useRef<boolean>(false);
  const lastAnnouncedPercentageRef = useRef<number>(-1);
  const router = useRouter();

  useEffect(() => {
    screenReaderRef.current = screenReaderEnabled;
  }, [screenReaderEnabled]);

  function getLightSourceDescription(source: LightEstimate['source']): string {
    switch (source) {
      case 'exif-brightness':
        return 'sensor de brilho do sistema';
      case 'exif-exposure':
        return 'exposição da câmera';
      default:
        return 'análise dos pixels';
    }
  }

  // Libera o áudio ao sair da tela
  useEffect(() => {
    return () => {
      stopWhistle();
      cleanup();
    };
  }, []);

  // Laço de leitura: mede a luz do que a câmera está vendo (Android, iOS e web).
  // Uma leitura só começa depois que a anterior terminou (nunca se sobrepõem).
  useEffect(() => {
    if (!permission?.granted || !cameraReady) return;

    let cancelled = false;
    const smoother = createLightSmoother(0.5);
    let announceCounter = 0;

    const run = async () => {
      let failures = 0;
      while (!cancelled) {
        const startedAt = Date.now();

        try {
          const camera = cameraRef.current;
          if (!camera) throw new Error('A câmera ainda não está disponível.');

          // O EXIF traz a exposição escolhida pela câmera, que mede a luz melhor
          // do que o brilho dos pixels (a câmera compensa o brilho sozinha)
          const sample = await captureSample(camera, { includeExif: true });
          if (cancelled) return;

          failures = 0;
          const estimate = estimateLight(meanLinearLuminance(sample.data), sample.exif);
          const smoothed = Math.round(smoother.smooth(estimate.percentage));
          setLightPercentage(smoothed);
          setLightSource(estimate.source);
          setHasReading(true);
          setCameraFailed(false);

          // Anuncia a cada 5 leituras (~2.5s) se mudou significativamente
          announceCounter++;
          if (announceCounter >= 5) {
            announceCounter = 0;
            const lastAnnounced = lastAnnouncedPercentageRef.current ?? -1;
            if (Math.abs(smoothed - lastAnnounced) >= 10) {
              lastAnnouncedPercentageRef.current = smoothed;
              const sourceText = getLightSourceDescription(estimate.source);
              const levelText = describeLightLevel(smoothed);
              const text = `Luz: ${formatValueForSpeech(smoothed, 'percent')}, ${levelText}. Medido via ${sourceText}`;
              if (screenReaderRef.current) {
                AccessibilityInfo.announceForAccessibility(text);
              } else {
                Speech.speak(text, { language: 'pt-BR' });
              }
            }
          }
        } catch (error) {
          if (cancelled) return;
          failures++;
          console.warn('Erro ao medir a luz:', error);
          if (failures === MAX_CONSECUTIVE_FAILURES) {
            setHasReading(false);
            setCameraFailed(true);
            // Com leitor de tela ligado, usa a voz dele (evita duas vozes ao mesmo tempo)
            if (screenReaderRef.current) {
              AccessibilityInfo.announceForAccessibility(CAMERA_UNAVAILABLE_TEXT);
            } else {
              Speech.speak(CAMERA_UNAVAILABLE_TEXT, { language: 'pt-BR' });
            }
          }
        }

        const elapsed = Date.now() - startedAt;
        await sleep(Math.max(50, LIGHT_UPDATE_INTERVAL_MS - elapsed));
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [permission?.granted, cameraReady]);

  // O apito só começa depois da primeira leitura real e acompanha a luz
  useEffect(() => {
    if (!permission?.granted || !hasReading || !isWhistleActive) {
      stopWhistle();
      return;
    }
    playLightDetectionWhistle(lightPercentage, WHISTLE_VOLUME);
  }, [permission?.granted, hasReading, isWhistleActive, lightPercentage]);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6 bg-background">
        <Text
          accessibilityRole="header"
          className="text-2xl font-bold text-foreground text-center mb-4"
        >
          Permissão de Câmera Necessária
        </Text>
        <Text className="text-lg text-foreground text-center mb-6">
          Este app precisa de acesso à câmera para detectar luz.
        </Text>
        <Pressable
          onPress={async () => {
            if (Platform.OS !== 'web') {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            requestPermission();
          }}
          style={({ pressed }) => [
            pressed && { opacity: 0.8 },
          ]}
          className="bg-primary px-8 py-4 rounded-full"
          accessibilityRole="button"
          accessibilityLabel="Permitir acesso à câmera"
          accessibilityHint="Abre a janela do sistema para autorizar o uso da câmera"
        >
          <Text className="text-lg font-bold text-black text-center">
            Permitir Câmera
          </Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  const handleNavigateToColors = async () => {
    // Stop whistle before navigation
    stopWhistle();
    
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Navigate back to home
    router.back();
  };

  const toggleWhistle = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    if (isWhistleActive) {
      stopWhistle();
      setIsWhistleActive(false);
    } else {
      setIsWhistleActive(true);
    }
  };

  // Calculate indicator size based on light level
  const indicatorSize = 60 + (lightPercentage / 100) * 80;
  const currentFrequency = lightPercentageToFrequency(lightPercentage);

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        importantForAccessibility="no"
        onCameraReady={() => setCameraReady(true)}
      >
        {/* Overlay with light indicator */}
        <View style={styles.overlay}>
          {/* Light indicator (circle that grows with light) */}
          <View
            style={styles.indicatorContainer}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            <View
              style={[
                styles.lightIndicator,
                {
                  width: indicatorSize,
                  height: indicatorSize,
                },
              ]}
            />
          </View>

          {/* Light level text display */}
          <View
            style={styles.lightDisplayContainer}
            accessible
            accessibilityRole="text"
            accessibilityLabel={lightReadingLabel(lightPercentage, cameraFailed)}
          >
            <Text style={styles.lightLabel}>
              {cameraFailed ? CAMERA_UNAVAILABLE_TEXT : 'Intensidade de Luz'}
            </Text>
            <Text style={styles.lightPercentage}>
              {lightPercentage}%
            </Text>
            <Text style={styles.frequencyLabel}>
              {currentFrequency} Hz
            </Text>
            <Text style={styles.sourceLabel}>
              Fonte: {lightSource === 'exif-brightness' ? 'Sensor do sistema' : lightSource === 'exif-exposure' ? 'Exposição da câmera' : 'Análise de pixels'}
            </Text>
          </View>

          {/* Control buttons */}
          <View style={styles.buttonContainer}>
            {/* Toggle whistle button */}
            <Pressable
              onPress={toggleWhistle}
              accessibilityRole="switch"
              accessibilityLabel="Apito de luz"
              accessibilityHint="Liga ou desliga o som que muda conforme a luz"
              accessibilityState={{ checked: isWhistleActive }}
              style={({ pressed }) => [
                styles.toggleButton,
                pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 },
                !isWhistleActive && styles.toggleButtonInactive,
              ]}
            >
              <Text style={styles.toggleButtonText}>
                {isWhistleActive ? '🔊' : '🔇'}
              </Text>
            </Pressable>

            {/* Back button */}
            <Pressable
              onPress={handleNavigateToColors}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              accessibilityHint="Volta para a tela anterior"
              style={({ pressed }) => [
                styles.backButton,
                pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 },
              ]}
            >
              <Text style={styles.backButtonText}>← Voltar</Text>
            </Pressable>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  indicatorContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightIndicator: {
    width: 180,
    height: 180,
    borderWidth: 8,
    borderColor: '#000000',
    backgroundColor: '#FFFF00',
    borderRadius: 0,
  },
  lightDisplayContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  lightLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  lightPercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFF00',
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  frequencyLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: 8,
  },
  sourceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#CCCCCC',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginTop: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: '#FFFF00',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#000000',
  },
  toggleButtonInactive: {
    backgroundColor: '#CCCCCC',
    borderColor: '#666666',
  },
  toggleButtonText: {
    fontSize: 32,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FFFF00',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#000000',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
});
