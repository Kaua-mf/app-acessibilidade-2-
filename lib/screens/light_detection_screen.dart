import 'dart:async';

import 'package:app_acessibilidade/app_services.dart';
import 'package:app_acessibilidade/logic/accessibility_labels.dart';
import 'package:app_acessibilidade/logic/light_analysis.dart';
import 'package:app_acessibilidade/models/light_estimate.dart';
import 'package:app_acessibilidade/services/audio_service.dart' show lightPercentageToFrequency;
import 'package:app_acessibilidade/services/storage_service.dart';
import 'package:app_acessibilidade/theme.dart';
import 'package:app_acessibilidade/widgets/bottom_nav_bar.dart';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

const int lightUpdateIntervalMs = 500;
const double whistleVolume = 0.3;
const int maxConsecutiveFailures = 5;
const String cameraUnavailableText = 'Câmera indisponível';

/// Tela de detecção de luz. Espelha `light-detection.tsx`:
/// mede a intensidade da luz pela câmera e emite um apito de frequência
/// variável (quanta mais luz, mais agudo o apito).
class LightDetectionScreen extends StatefulWidget {
  const LightDetectionScreen({super.key});

  @override
  State<LightDetectionScreen> createState() => _LightDetectionScreenState();
}

class _LightDetectionScreenState extends State<LightDetectionScreen> {
  final _svc = AppServices.instance;

  int _lightPercentage = 0;
  bool _hasReading = false;
  bool _cameraReady = false;
  bool _cameraFailed = false;
  bool _isWhistleActive = true;
  LightSource _lightSource = LightSource.pixels;
  bool _capturing = false;
  bool _loopCancel = false;
  int _failures = 0;
  int _announceCounter = 0;
  int _lastAnnouncedPercentage = -1;

  final LightSmoother _smoother = LightSmoother(alpha: 0.5);

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _startLoop();
  }

  Future<void> _loadSettings() async {
    final s = await StorageService.loadSpeechSettings();
    if (!mounted) return;
    await _svc.tts.applySettings(s);
  }

  Future<void> _retryCamera() async {
    setState(() {
      _cameraFailed = false;
      _cameraReady = false;
    });
    try {
      await _svc.camera.init();
      if (mounted) setState(() => _cameraReady = true);
    } catch (e) {
      if (mounted) setState(() => _cameraFailed = true);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_cameraReady && !_cameraFailed) {
      _retryCamera();
    }
  }

  void _startLoop() {
    _loopCancel = false;
    _loop();
  }

  String _lightSourceDescription(LightSource source) {
    switch (source) {
      case LightSource.exifBrightness:
        return 'sensor de brilho do sistema';
      case LightSource.exifExposure:
        return 'exposição da câmera';
      case LightSource.pixels:
        return 'análise de pixels';
    }
  }

  /// Laço de leitura: mede a luz, atualiza a UI e anuncia periodicamente.
  Future<void> _loop() async {
    while (!_loopCancel) {
      final started = DateTime.now().millisecondsSinceEpoch;

      if (_svc.camera.controller != null &&
          _svc.camera.controller!.value.isInitialized &&
          !_capturing) {
        try {
          _capturing = true;
          final sample = await _svc.camera.captureSample();
          _failures = 0;
          _cameraFailed = false;

          final estimate = estimateLight(
            meanLinearLuminance(sample.data),
            // EXIF não é usado nesta porta Flutter (mantém-se 'pixels').
          );

          final smoothed = _smoother.smooth(estimate.percentage.toDouble()).round();
          setState(() {
            _lightPercentage = smoothed;
            _lightSource = estimate.source;
            _hasReading = true;
          });

          // Anuncia a cada 5 leituras (~2.5s) se mudou significativamente
          _announceCounter++;
          if (_announceCounter >= 5) {
            _announceCounter = 0;
            if ((smoothed - _lastAnnouncedPercentage).abs() >= 10) {
              _lastAnnouncedPercentage = smoothed;
              final sourceText = _lightSourceDescription(estimate.source);
              final levelText = describeLightLevel(smoothed.toDouble());
              final text =
                  'Luz: ${formatValueForSpeech(smoothed.toDouble(), valueUnitPercent)}, $levelText. Medido via $sourceText';
              await _svc.tts.speak(text);
            }
          }
        } catch (e) {
          _failures++;
          debugPrint('Erro ao medir a luz: $e');
          if (_failures == maxConsecutiveFailures && mounted) {
            setState(() {
              _hasReading = false;
              _cameraFailed = true;
            });
            await _svc.tts.speak(cameraUnavailableText);
          }
        } finally {
          if (mounted) _capturing = false;
        }
      }

      if (_loopCancel) break;
      final elapsed = DateTime.now().millisecondsSinceEpoch - started;
      final delay = (lightUpdateIntervalMs - elapsed).clamp(50, 10000);
      await Future.delayed(Duration(milliseconds: delay));
    }
  }

  /// Liga/desliga o apito conforme a leitura atual de luz.
  Future<void> _syncWhistle() async {
    if (!_hasReading || !_isWhistleActive) {
      await _svc.audio.stop();
      return;
    }
    final frequency = lightPercentageToFrequency(_lightPercentage.toDouble());
    await _svc.audio.playWhistle(frequency, whistleVolume);
  }

  @override
  void dispose() {
    _loopCancel = true;
    _svc.audio.stop();
    super.dispose();
  }

  Future<void> _toggleWhistle() async {
    setState(() => _isWhistleActive = !_isWhistleActive);
    await _syncWhistle();
  }

  Future<void> _goBack() async {
    await _svc.audio.stop();
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_cameraReady) {
      return _cameraNotReadyView();
    }

    final indicatorSize = 60 + (_lightPercentage / 100) * 80;
    final currentFrequency = lightPercentageToFrequency(_lightPercentage.toDouble());

    return Scaffold(
      backgroundColor: AppColors.black,
      body: Stack(
        children: [
          IgnorePointer(child: CameraPreview(_svc.camera.controller!)),
          _buildOverlay(indicatorSize, currentFrequency),
        ],
      ),
      bottomNavigationBar: BottomNavBar(
        selectedIndex: 1,
        onTap: (i) => context.go(_navRoutes[i]),
      ),
    );
  }

  Widget _cameraNotReadyView() {
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
              ),
              const SizedBox(height: 16),
              const Text(
                'Este app precisa de acesso à câmera para detectar luz.',
                style: TextStyle(color: AppColors.white, fontSize: 16),
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

  Widget _buildOverlay(double indicatorSize, double currentFrequency) {
    final sourceLabelText =
        'Fonte: ${_lightSource == LightSource.exifBrightness ? 'Sensor do sistema' : _lightSource == LightSource.exifExposure ? 'Exposição da câmera' : 'Análise de pixels'}';

    return Stack(
      children: [
        // Indicador de luz (círculo amarelo que cresce com a intensidade)
        Center(
          child: Container(
            width: indicatorSize,
            height: indicatorSize,
            decoration: BoxDecoration(
              color: AppColors.yellow,
              border: Border.all(color: AppColors.black, width: 8),
            ),
          ),
        ),

        // Texto do nível de luz
        Positioned(
          bottom: 130,
          left: 0,
          right: 0,
          child: Column(
            children: [
              Semantics(
                label: lightReadingLabel(_lightPercentage.toDouble(), _cameraFailed),
                child: Text(
                  _cameraFailed ? cameraUnavailableText : 'Intensidade de Luz',
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${_lightPercentage}%',
                style: const TextStyle(
                  color: AppColors.yellow,
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${currentFrequency.toInt()} Hz',
                style: const TextStyle(
                  color: AppColors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                sourceLabelText,
                style: const TextStyle(color: AppColors.grayLight, fontSize: 13),
              ),
            ],
          ),
        ),

        // Botões de controle
        Positioned(
          bottom: 30,
          left: 0,
          right: 0,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _amberIconButton(
                _isWhistleActive ? '🔊' : '🔇',
                _toggleWhistle,
                label: 'Apito de luz',
              ),
              const SizedBox(width: 16),
              _amberButton('← Voltar', _goBack, width: 110, height: 50, fontSize: 16),
            ],
          ),
        ),
      ],
    );
  }

  Widget _amberButton(String label, VoidCallback onPressed,
      {double width = 110, double height = 50, double fontSize = 16}) {
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
        width: 80,
        height: 80,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.yellow,
            foregroundColor: AppColors.black,
            elevation: 0,
            shape: const CircleBorder(side: BorderSide(color: AppColors.black, width: 4)),
            padding: EdgeInsets.zero,
          ),
          onPressed: onPressed,
          child: Text(icon, style: const TextStyle(fontSize: 34)),
        ),
      ),
    );
  }
}

/// Rotas da barra inferior, na mesma ordem dos itens de `BottomNavBar`.
const List<String> _navRoutes = [
  '/color-detection',
  '/light-detection',
  '/calibration',
];
