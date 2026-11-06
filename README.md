# app_acessibilidade

App de acessibilidade visual em **Flutter/Dart**, port do app Expo/React Native
(`app-acessibilidade-2--main`).

Funcionalidades:

- **Home**: entrada para Identificação de Cores e Detecção de Luz
- **Identificação de cores**: usa a câmera, lê a cor no centro do frame, anuncia
  o nome por voz (TTS em pt-BR), com estabilização de leitura, correção de
  balanço de branco e estimativa de temperatura de cor
- **Detecção de luz**: mede a intensidade de luz pela câmera e emite um apito
  de frequência variável (quanta mais luz, mais agudo o apito)
- **Calibração**: sensibilidade de cor, confiança mínima, tamanho da região,
  frequência de atualização, presets (Interior/Exterior/Pouca Luz) e
  configurações de fala (taxa, tom, volume)

## Pré-requisitos

- [Flutter SDK](https://docs.flutter.dev/get-started/install) (3.3+)
- Android Studio / SDK com licenças aceitas (`flutter doctor --android-licenses`) para rodar no Android
- Um dispositivo físico Android/iOS ou emulador

## Como rodar

```bash
cd flutter_app
flutter pub get
flutter run
```

## Permissões

- Android: `CAMERA` (solicitada em runtime pelo app)
- iOS: `NSCameraUsageDescription` (já configurado no `Info.plist` gerado)

## Estrutura

```
lib/
  main.dart           - ponto de entrada + roteamento (go_router)
  app_router.dart     - rotas e navegação entre telas
  theme.dart          - cores e tema (preto + amarelo, espelhando o app original)
  models/             - ColorData, CalibrationSettings, SpeechSettings, LightEstimate
  logic/              - lógica pura (ciência da cor, detecção, estabilização, luz, rótulos de acessibilidade)
  services/           - câmera (camera), TTS (flutter_tts), apito (audioplayers), armazenamento (shared_preferences)
  screens/            - Home, ColorDetection, LightDetection, Calibration
test/                 - testes de unidade da lógica pura
```

Nota: o back-end Node/Express/tRPC/MySQL do repositório original não faz parte do
Flutter (Flutter é cliente móvel). O app funciona totalmente off-line; a detecção
de cor/luz roda localmente no dispositivo.
