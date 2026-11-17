---
name: project-context
description: Contexto do projeto app_acessibilidade_2 e decisões de implementação
metadata:
  type: project
---

STATUS: IMPLEMENTADO — app com telas do exemplo, logo, classificação de cores aprimorada e permissões.

Projeto Flutter (SDK 3.50, Dart 3.14) de acessibilidade.
Telas (fundo preto #000000, amarelo neon #FFFFE400):
1. Home — cartões Cores/Luz, nav bar inferior, TTS/STT/contraste/tamanho fonte. Logo no AppBar. Solicita permissão de áudio no init.
2. Identificação de Cores — câmera com lâmpada no centro. Classificação aprimorada: salmão, bege, marrom, vermelho, laranja, amarelo, verde, ciano, azul, violeta, magenta, branco, cinzas, preto. Média de região central (100x100px) + estabilização (4 leituras, 3 concordam). Se não confiar, mostra "Indefinido". Solicita permissão de câmera.
3. Detecção de Luz — câmera com lâmpada no centro. Apito senoide em loop: 100 Hz (escuro) a 1200 Hz (claro). Exibe % e Hz. Solicita permissão de câmera.
4. Calibração — Presets Rápidos, Sensibilidade de Cores, Confiança Mínima, Tamanho da Regulagem.

Arquivos novos:
- lib/services/permission_service.dart — serviço de permissões (câmera, microfone, abrir configurações)
- lib/audio/tone_generator.dart — gera WAV senoide para o apito

Dependências: camera ^0.12.2, image ^4.3.0, path_provider ^2.1.4, path ^1.9.0, audioplayers ^6.0.0, flutter_launcher_icons ^0.14.1
Permissões: AndroidManifest (CAMERA, RECORD_AUDIO), Info.plist (NSCameraUsageDescription, NSMicrophoneUsageDescription)
Asset: assets/images/logo.jpg (ícone launcher Android+iOS)

Não testado via flutter run (sem permissão para executar). Usuário deve rodar: flutter pub get && flutter analyze lib/ && flutter run -d windows
