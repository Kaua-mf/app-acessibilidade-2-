import React, { useState, useRef, useEffect } from 'react';
import { AccessibilityInfo, View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import {
  CAMERA_UNAVAILABLE_NAME,
  INITIALIZING_COLOR_NAME,
  colorReadingLabel,
} from '@/lib/accessibility-labels';
import { useScreenReaderEnabled } from '@/lib/use-screen-reader';
import { detectColorFromImageData } from '@/lib/color-detection';
import {
  createColorStabilizer,
  framesFromSensitivity,
  isConfidentEnough,
  UNCERTAIN_COLOR_NAME,
} from '@/lib/color-stabilizer';
import { captureSample } from '@/lib/frame-capture';
import { regionRadiusFromSetting } from '@/lib/frame-sampling';
import {
  DEFAULT_SETTINGS,
  loadCalibrationSettings,
  type CalibrationSettings,
} from '@/lib/calibration-settings';
import {
  DEFAULT_SPEECH_SETTINGS,
  loadSpeechSettings,
  type SpeechSettings,
} from '@/lib/speech-settings';

interface DetectedColorData {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  confidence: number;
  alternatives?: Array<{ name: string; hex: string; confidence: number }>;
  isAmbiguous?: boolean;
  sceneCct?: number | null;
  temperatureCategory?: string | null;
  temperatureDescription?: string | null;
  whiteBalanceCorrected?: boolean;
}

// Depois de tantas falhas seguidas, avisa que a câmera não está funcionando
const MAX_CONSECUTIVE_FAILURES = 5;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function ColorDetectionScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [detectedColor, setDetectedColor] = useState<DetectedColorData>({
    name: INITIALIZING_COLOR_NAME,
    hex: '#808080',
    rgb: { r: 128, g: 128, b: 128 },
    confidence: 0,
  });
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);
  // Configurações em refs: o laço de leitura sempre usa o valor mais recente
  const speechSettingsRef = useRef<SpeechSettings>(DEFAULT_SPEECH_SETTINGS);
  const calibrationRef = useRef<CalibrationSettings>(DEFAULT_SETTINGS);
  const screenReaderEnabled = useScreenReaderEnabled();
  // Em ref: o laço de leitura sempre usa o valor mais recente, sem precisar reiniciar
  const screenReaderRef = useRef<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    screenReaderRef.current = screenReaderEnabled;
  }, [screenReaderEnabled]);

  // Carrega as configurações de fala e de calibração
  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      const [speech, calibration] = await Promise.all([
        loadSpeechSettings(),
        loadCalibrationSettings(),
      ]);
      if (active) {
        speechSettingsRef.current = speech;
        calibrationRef.current = calibration;
      }
    };
    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  // Laço de leitura: tira uma amostra, descobre a cor, confirma e fala.
  // Uma leitura só começa depois que a anterior terminou (nunca se sobrepõem).
  useEffect(() => {
    if (!permission?.granted || !cameraReady) return;

    let cancelled = false;
    const stabilizer = createColorStabilizer(
      framesFromSensitivity(calibrationRef.current.colorSensitivity)
    );
    let failures = 0;
    let failureAnnounced = false;

    const announce = (text: string) => {
      const speech = speechSettingsRef.current;
      if (!speech.enabled) return;
      // Com leitor de tela ligado (TalkBack/VoiceOver), usa a voz dele: evita duas vozes
      // falando ao mesmo tempo e respeita a velocidade que a pessoa já ajustou no aparelho.
      if (screenReaderRef.current) {
        AccessibilityInfo.announceForAccessibility(text);
        return;
      }
      // Interrompe a fala anterior para a cor nova não ficar para trás
      Speech.stop();
      Speech.speak(text, {
        language: 'pt-BR',
        pitch: speech.pitch,
        rate: speech.rate,
        volume: speech.volume,
      });
    };

    const run = async () => {
      while (!cancelled) {
        const startedAt = Date.now();
        const calibration = calibrationRef.current;

        try {
          const camera = cameraRef.current;
          if (!camera) throw new Error('A câmera ainda não está disponível.');

          const sample = await captureSample(camera);
          if (cancelled) return;

          failures = 0;
          failureAnnounced = false;

          const radius = regionRadiusFromSetting(
            calibration.regionSize,
            sample.width,
            sample.height
          );
          const reading = detectColorFromImageData(
            sample.data,
            sample.width,
            sample.height,
            undefined,
            undefined,
            radius
          );

          const uncertain = !isConfidentEnough(reading.confidence, calibration.minConfidence);
          const name = uncertain ? 'Cor incerta' : reading.name;

          stabilizer.setRequiredFrames(framesFromSensitivity(calibration.colorSensitivity));
          const confirmed = stabilizer.push(name);
          if (confirmed) {
            setDetectedColor({
              name: confirmed,
              hex: reading.hex,
              rgb: reading.rgb,
              confidence: reading.confidence,
              alternatives: reading.alternatives,
              isAmbiguous: reading.isAmbiguous,
              sceneCct: reading.sceneCct,
              temperatureCategory: reading.temperatureCategory,
              temperatureDescription: reading.temperatureDescription,
              whiteBalanceCorrected: reading.whiteBalanceCorrected,
            });
            announce(confirmed);
          }
        } catch (error) {
          if (cancelled) return;
          failures++;
          console.warn('Erro ao ler a cor:', error);
          if (failures >= MAX_CONSECUTIVE_FAILURES && !failureAnnounced) {
            failureAnnounced = true;
            stabilizer.reset();
            setDetectedColor({
              name: CAMERA_UNAVAILABLE_NAME,
              hex: '#808080',
              rgb: { r: 128, g: 128, b: 128 },
              confidence: 0,
            });
            announce(CAMERA_UNAVAILABLE_NAME);
          }
        }

        const elapsed = Date.now() - startedAt;
        await sleep(Math.max(50, calibration.updateFrequency - elapsed));
      }
    };

    run();

    return () => {
      cancelled = true;
      Speech.stop();
    };
  }, [permission?.granted, cameraReady]);

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
          Este app precisa de acesso à câmera para identificar cores.
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

  const handleNavigateToLightMode = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Navigate to light-detection tab
    router.push('/light-detection');
  };

  const handleGoBack = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.back();
  };

  // Get color preview circle
  const colorPreviewStyle = {
    backgroundColor: detectedColor.hex,
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        importantForAccessibility="no"
        onCameraReady={() => setCameraReady(true)}
      >
        {/* Overlay with reading frame and color display */}
        <View style={styles.overlay}>
          {/* Back button - Top left */}
          <Pressable
            onPress={handleGoBack}
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

          {/* Reading frame (center) */}
          <View
            style={styles.readingFrame}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            {/* Color preview circle inside frame */}
            <View style={[styles.colorPreview, colorPreviewStyle]} />
          </View>

          {/* Color name and confidence display */}
          <View
            style={styles.colorDisplayContainer}
            accessible
            accessibilityRole="text"
            accessibilityLabel={colorReadingLabel(detectedColor.name, detectedColor.confidence)}
          >
            <Text style={[
              styles.colorName,
              detectedColor.name === 'Cor incerta' && styles.colorNameUncertain,
            ]}>
              {detectedColor.name}
            </Text>
            <Text style={styles.confidenceText}>
              Confiança: {detectedColor.confidence}%
            </Text>
          </View>

          {/* Light Mode button */}
          <Pressable
            onPress={handleNavigateToLightMode}
            accessibilityRole="button"
            accessibilityLabel="Abrir detecção de luz"
            accessibilityHint="Muda para o modo que mede a luz com um apito"
            style={({ pressed }) => [
              styles.modeButton,
              pressed && { transform: [{ scale: 0.95 }], opacity: 0.8 },
            ]}
          >
            <Text style={styles.modeButtonText}>💡</Text>
          </Pressable>
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
  readingFrame: {
    width: 180,
    height: 180,
    borderWidth: 8,
    borderColor: '#FFFF00',
    backgroundColor: '#FFFF00',
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  colorPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  colorDisplayContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  colorName: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
    marginBottom: 12,
  },
  confidenceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFF00',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  rgbText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  colorNameUncertain: {
    color: '#FF6666',
  },
  modeButton: {
    backgroundColor: '#FFFF00',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#000000',
  },
  modeButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#FFFF00',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#000000',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
});
