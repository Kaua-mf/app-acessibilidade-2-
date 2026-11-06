import 'dart:async';

import 'package:app_acessibilidade/app_services.dart';
import 'package:app_acessibilidade/logic/accessibility_labels.dart' hide uncertainColorName;
import 'package:app_acessibilidade/logic/color_detection.dart';
import 'package:app_acessibilidade/logic/color_stabilizer.dart';
import 'package:app_acessibilidade/models/color_data.dart';
import 'package:app_acessibilidade/logic/frame_sampling.dart';
import 'package:app_acessibilidade/models/calibration_settings.dart';
import 'package:app_acessibilidade/services/storage_service.dart';
import 'package:app_acessibilidade/theme.dart';
import 'package:app_acessibilidade/widgets/bottom_nav_bar.dart';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Tela de identificação de cores. Espelha `color-detection.tsx`:
/// câmera contínua, detecção no centro do frame, estabilização de leitura,
/// anuncio por TTS e correção de balanço de branco.
class ColorDetectionScreen extends StatefulWidget {
  const ColorDetectionScreen({super.key});

  @override
  State<ColorDetectionScreen> createState() => _ColorDetectionScreenState();
}

class _ColorDetectionScreenState extends State<ColorDetectionScreen> {
  final _svc = AppServices.instance;

  ColorData _detectedColor = ColorData.initializing();
  bool _cameraReady = false;
  bool _cameraError = false;
  bool _capturing = false;
  bool _loopCancel = false;
  int _failures = 0;
  bool _failureAnnounced = false;

  CalibrationSettings _calibration = CalibrationSettings.defaults;
  ColorStabilizer? _stabilizer;

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _startLoop();
  }

  Future<void> _loadSettings() async {
    final c = await StorageService.loadCalibrationSettings();
    final s = await StorageService.loadSpeechSettings();
    if (!mounted) return;
    setState(() {
      _calibration = c;
      _stabilizer = createColorStabilizer(framesFromSensitivity(c.colorSensitivity));
    });
    await _svc.tts.applySettings(s);
  }

  Future<void> _retryCamera() async {
    setState(() => _cameraError = false);
    try {
      await _svc.camera.init();
      if (mounted) setState(() => _cameraReady = true);
    } catch (e) {
      if (mounted) setState(() => _cameraError = true);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_cameraReady && !_cameraError) {
      _retryCamera();
    }
  }

  void _startLoop() {
    _loopCancel = false;
    _loop();
  }

  /// Laço de leitura: captura, detecta, estabiliza e fala. Uma leitura de
  /// cada vez (nunca se sobrepõem), respeitando a frequência de atualização.
  Future<void> _loop() async {
    while (!_loopCancel) {
      final started = DateTime.now().millisecondsSinceEpoch;

      if (_cameraReady &&
          _svc.camera.controller != null &&
          _svc.camera.controller!.value.isInitialized &&
          !_capturing) {
        try {
          _capturing = true;
          final sample = await _svc.camera.captureSample();
          _failures = 0;
          _failureAnnounced = false;

          final radius = regionRadiusFromSetting(
            _calibration.regionSize,
            sample.width,
            sample.height,
          );
          final reading = detectColorFromImageData(
            sample.data,
            width: sample.width,
            height: sample.height,
            regionRadius: radius,
          );

          final uncertain = !isConfidentEnough(
            reading.confidence,
            _calibration.minConfidence.toDouble(),
          );
          final name = uncertain ? uncertainColorName : reading.name;
          _stabilizer?.setRequiredFrames(
            framesFromSensitivity(_calibration.colorSensitivity),
          );
          final confirmed = _stabilizer?.push(name);

          if (confirmed != null && mounted) {
            setState(() => _detectedColor = reading);
            await _svc.tts.speak(colorReadingLabel(confirmed, reading.confidence));
          }
        } catch (e) {
          _failures++;
          debugPrint('Erro ao ler a cor: $e');
          if (_failures >= 5 && !_failureAnnounced && mounted) {
            _failureAnnounced = true;
            _stabilizer?.reset();
            setState(() => _detectedColor = ColorData.cameraUnavailable());
            await _svc.tts.speak(colorReadingLabel(cameraUnavailableName, 0));
          }
        } finally {
          if (mounted) _capturing = false;
        }
      }

      if (_loopCancel) break;
      final elapsed = DateTime.now().millisecondsSinceEpoch - started;
      final delay = (_calibration.updateFrequency - elapsed).clamp(50, 10000);
      await Future.delayed(Duration(milliseconds: delay));
    }
  }

  @override
  void dispose() {
    _loopCancel = true;
    super.dispose();
  }

  Future<void> _goBack() async {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  Future<void> _goToLight() async {
    if (mounted) context.push('/light-detection');
  }

  @override
  Widget build(BuildContext context) {
    if (_cameraError) {
      return _permissionView();
    }

    final showingInitial = _detectedColor.name == 'Inicializando...';

    return Scaffold(
      backgroundColor: AppColors.black,
      body: Stack(
        children: [
          // Câmera ocupa a tela toda (ignora toques para não bloquear os botões).
          if (_cameraReady) IgnorePointer(child: CameraPreview(_svc.camera.controller!)),

          // Mira no centro da tela (mostra para onde a câmera está apontando).
          const Center(child: _CenterCrosshair()),

          // Indicador de cor no canto superior direito (pequeno, não bloqueia a visão).
          Positioned(
            top: 14,
            right: 14,
            child: _ColorIndicator(
              color: _detectedColor,
              showingInitial: showingInitial,
            ),
          ),

          // Voltar (canto superior esquerdo).
          Positioned(
            top: 14,
            left: 14,
            child: _amberButton(
              '← Voltar',
              _goBack,
              width: 100,
              height: 44,
              fontSize: 14,
            ),
          ),

          // Botão modo luz (direita, abaixo do centro).
          Positioned(
            bottom: 120,
            right: 14,
            child: _amberIconButton(
              '💡',
              _goToLight,
              label: 'Abrir detecção de luz',
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavBar(
        selectedIndex: 0,
        onTap: (i) => context.go(_navRoutes[i]),
      ),
    );
  }

  Widget _permissionView() {
    return Scaffold(
      backgroundColor: AppColors.black,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Permissão de Câmera Necessária',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
                semanticsLabel: 'Permissão de câmera necessária',
              ),
              const SizedBox(height: 16),
              Text(
                'Este app precisa de acesso à câmera para identificar cores.',
                style: const TextStyle(color: AppColors.white, fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              _amberButton('Permitir Câmera', _retryCamera),
            ],
          ),
        ),
      ),
    );
  }

  /// Botão amarelo com borda preta (estilo do app original).
  Widget _amberButton(String label, VoidCallback onPressed,
      {double width = 100, double height = 44, double fontSize = 14}) {
    return SizedBox(
      width: width,
      height: height,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.yellow,
          foregroundColor: AppColors.black,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: const BorderSide(color: AppColors.black, width: 3),
          ),
        ),
        onPressed: onPressed,
        child: Text(
          label,
          style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _amberIconButton(String icon, VoidCallback onPressed,
      {required String label}) {
    return Semantics(
      label: label,
      button: true,
      child: SizedBox(
        width: 70,
        height: 70,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.yellow,
            foregroundColor: AppColors.black,
            elevation: 0,
            shape: const CircleBorder(side: BorderSide(color: AppColors.black, width: 4)),
            padding: EdgeInsets.zero,
          ),
          onPressed: onPressed,
          child: Text(icon, style: const TextStyle(fontSize: 30)),
        ),
      ),
    );
  }
}

/// Mira pequena e discreta no centro da tela para mostrar onde a câmera aponta.
class _CenterCrosshair extends StatelessWidget {
  const _CenterCrosshair();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 40,
      height: 40,
      child: Center(
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Linha vertical.
            Container(width: 2, height: 28, color: AppColors.yellow),
            // Linha horizontal.
            Container(width: 28, height: 2, color: AppColors.yellow),
            // Ponto central.
            Container(width: 6, height: 6, color: AppColors.yellow),
          ],
        ),
      ),
    );
  }
}

/// Indicador pequeno da cor detectada no canto da tela.
class _ColorIndicator extends StatelessWidget {
  final ColorData color;
  final bool showingInitial;

  const _ColorIndicator({
    required this.color,
    required this.showingInitial,
  });

  @override
  Widget build(BuildContext context) {
    final name = showingInitial ? 'Inicializando...' : color.name;
    final conf = color.confidence.toInt();

    return Container(
      width: 150,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.black.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.yellow, width: 2),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Amostrinha da cor.
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: _colorFromHex(color.hex),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.white, width: 2),
            ),
          ),
          const SizedBox(height: 4),
          // Nome da cor.
          Text(
            name,
            style: TextStyle(
              color: AppColors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
              shadows: [Shadow(blurRadius: 2, color: AppColors.black, offset: const Offset(1, 1))],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          // Confiança.
          Text(
            'Confiança: $conf%',
            style: const TextStyle(
              color: AppColors.yellow,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  /// Converte '#RRGGBB' em Color.
  Color _colorFromHex(String hex) {
    return Color(int.parse('FF${hex.substring(1)}', radix: 16));
  }
}

/// Rotas da barra inferior, na mesma ordem dos itens de `BottomNavBar`.
const List<String> _navRoutes = [
  '/color-detection',
  '/light-detection',
  '/calibration',
];
