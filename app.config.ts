// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "space.manus.acessibilidade.visual.app.t20260417080113";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "Acessibilidade Visual",
  appSlug: "acessibilidade-visual-app",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310419663030875481/cxNmPNzWGKhjTJmjQU4mb2/icon-4r9SUUVyij4VR58Sjhe5ds.webp",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
  // App description for accessibility
  description: "Aplicativo móvel para acessibilidade visual com detecção de cores e luz",
};

// Textos que o iOS mostra ao pedir permissão. Precisam dizer, com clareza, para
// que o app usa o recurso (exigência da App Store).
const cameraPermissionText =
  "O $(PRODUCT_NAME) usa a câmera para identificar a cor do objeto à sua frente e medir a luz do ambiente. As imagens são processadas no aparelho e não são salvas nem enviadas.";
// O app nunca grava áudio: só toca o apito e a voz. Esse texto não deve aparecer
// para o usuário, mas o plugin da câmera pode deixar a chave no Info.plist.
const microphonePermissionText = "O $(PRODUCT_NAME) não grava áudio.";

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // O app é só em português: faz os botões do aviso de permissão do sistema
      // (Permitir / Não permitir) aparecerem em português também
      CFBundleDevelopmentRegion: "pt-BR",
      CFBundleLocalizations: ["pt-BR"],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    // O app só precisa de câmera (adicionada pelo expo-camera) e vibração
    // (adicionada pelo expo-haptics). Estas duas vêm de bibliotecas, mas o app
    // não grava áudio nem envia notificações, então são removidas do manifesto.
    // blockedPermissions é a única forma de tirar permissões de bibliotecas.
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.POST_NOTIFICATIONS",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-camera",
      {
        cameraPermission: cameraPermissionText,
        microphonePermission: microphonePermissionText,
        recordAudioAndroid: false,
        // O app não lê códigos de barras
        barcodeScannerEnabled: false,
      },
    ],
    [
      // Só toca o apito enquanto a tela de luz está aberta: sem gravação e sem
      // reprodução em segundo plano (que adicionaria serviço em primeiro plano
      // no Android e o modo de áudio em segundo plano no iOS)
      "expo-audio",
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
