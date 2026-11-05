import { Image, Pressable, Platform, StyleSheet, Text, View } from "react-native";
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  const handleColorDetectionPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    router.push('/color-detection');
  };

  const handleLightDetectionPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    router.push('/light-detection');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/icon.png')}
        style={styles.logo}
        alt="Logo do app"
      />

      <View style={styles.buttons}>
        <Pressable
          onPress={handleColorDetectionPress}
          accessibilityRole="button"
          accessibilityLabel="Identificação de cores. Detecte e identifique cores em tempo real."
          accessibilityHint="Abre a câmera para identificar cores"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>🎨 Identificação de Cores</Text>
        </Pressable>

        <Pressable
          onPress={handleLightDetectionPress}
          accessibilityRole="button"
          accessibilityLabel="Detecção de luz. Ouça um apito que muda conforme a intensidade de luz."
          accessibilityHint="Abre a câmera para medir a luz"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>💡 Detecção de Luz</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },

  buttons: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },

  button: {
    width: '100%',
    backgroundColor: '#FFFF00',
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },

  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },

  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
  },
});
