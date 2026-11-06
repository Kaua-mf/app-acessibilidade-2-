import 'dart:async';

import 'package:app_acessibilidade/app_services.dart';
import 'package:app_acessibilidade/logic/accessibility_labels.dart';
import 'package:app_acessibilidade/models/calibration_settings.dart';
import 'package:app_acessibilidade/models/speech_settings.dart';
import 'package:app_acessibilidade/services/storage_service.dart';
import 'package:app_acessibilidade/theme.dart';
import 'package:app_acessibilidade/widgets/bottom_nav_bar.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Tela de calibração. Espelha `calibration.tsx`: presets, sliders de
/// sensibilidade/confiança/região/frequência, configurações de fala e
/// persistência em SharedPreferences.
class CalibrationScreen extends StatefulWidget {
  const CalibrationScreen({super.key});

  @override
  State<CalibrationScreen> createState() => _CalibrationScreenState();
}

class _CalibrationScreenState extends State<CalibrationScreen> {
  final _svc = AppServices.instance;

  CalibrationSettings _settings = CalibrationSettings.defaults;
  SpeechSettings _speech = SpeechSettings.defaults;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final results = await Future.wait([
        StorageService.loadCalibrationSettings(),
        StorageService.loadSpeechSettings(),
      ]);
      if (!mounted) return;
      final speech = results[1] as SpeechSettings;
      setState(() {
        _settings = results[0] as CalibrationSettings;
        _speech = speech;
        _isLoading = false;
      });
      await _svc.tts.applySettings(speech);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      debugPrint('Erro ao carregar configurações: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppColors.black,
        body: const Center(
          child: Text(
            'Carregando...',
            style: TextStyle(color: AppColors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.black,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header
            const SizedBox(height: 8),
            Center(
              child: Text(
                '⚙️ Calibração',
                style: const TextStyle(
                  color: AppColors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Center(
              child: Text(
                _settings.description,
                style: const TextStyle(
                  color: AppColors.yellow,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 24),

            // Presets
            _sectionTitle('Presets Rápidos'),
            _presetsRow(),
            const SizedBox(height: 24),

            // Sensibilidade
            _sliderSection(
              title: 'Sensibilidade de Cores',
              valueText: '${_settings.colorSensitivity}%',
              optionLabel: optionLabel('Sensibilidade de cores', _settings.colorSensitivity.toDouble(), valueUnitPercent),
              minLabel: 'Tolerante',
              maxLabel: 'Rigoroso',
              progress: _settings.colorSensitivity / 100,
              values: const [0, 25, 50, 75, 100],
              selected: _settings.colorSensitivity.toDouble(),
              onValue: (v) => _changeSensitivity(v.toInt()),
            ),
            const SizedBox(height: 24),

            // Confiança mínima
            _sliderSection(
              title: 'Confiança Mínima',
              valueText: '${_settings.minConfidence}%',
              optionLabel: optionLabel('Confiança mínima', _settings.minConfidence.toDouble(), valueUnitPercent),
              minLabel: 'Baixa',
              maxLabel: 'Alta',
              progress: _settings.minConfidence / 100,
              values: const [30, 50, 70, 85, 100],
              selected: _settings.minConfidence.toDouble(),
              onValue: (v) => _changeMinConfidence(v.toInt()),
            ),
            const SizedBox(height: 24),

            // Tamanho da região
            _sliderSection(
              title: 'Tamanho da Região',
              valueText: '${_settings.regionSize}px',
              optionLabel: optionLabel('Tamanho da região', _settings.regionSize.toDouble(), valueUnitPixels),
              minLabel: 'Pequeno',
              maxLabel: 'Grande',
              progress: ((_settings.regionSize - 5) / 45).clamp(0.0, 1.0),
              values: const [10, 15, 20, 30, 40],
              selected: _settings.regionSize.toDouble(),
              onValue: (v) => _changeRegionSize(v.toInt()),
            ),
            const SizedBox(height: 24),

            // Frequência de atualização
            _sliderSection(
              title: 'Frequência de Atualização',
              valueText: '${_settings.updateFrequency}ms',
              optionLabel: optionLabel('Frequência de atualização', _settings.updateFrequency.toDouble(), valueUnitMilliseconds),
              minLabel: 'Rápido',
              maxLabel: 'Lento',
              progress: ((_settings.updateFrequency - 200) / 800).clamp(0.0, 1.0),
              values: const [300, 500, 700, 900, 1000],
              selected: _settings.updateFrequency.toDouble(),
              onValue: (v) => _changeUpdateFrequency(v.toInt()),
            ),
            const SizedBox(height: 24),

            // Configurações de fala
            _sectionTitle('🔊 Configurações de Fala'),
            const SizedBox(height: 8),
            _sliderSection(
              title: 'Velocidade da Fala',
              valueText: _speech.rateDescription,
              optionLabel: optionLabel('Velocidade da fala', _speech.rate, valueUnitMultiplier),
              minLabel: 'Lento',
              maxLabel: 'Rápido',
              progress: ((_speech.rate - 0.5) / 1.5).clamp(0.0, 1.0),
              values: const [0.6, 0.8, 0.9, 1.1, 1.3],
              selected: _speech.rate,
              onValue: (v) => _changeSpeechRate(v),
              valueFormatter: (v) => v.toStringAsFixed(1) + 'x',
            ),
            const SizedBox(height: 12),
            _sliderSection(
              title: 'Tom da Voz',
              valueText: _speech.pitchDescription,
              optionLabel: optionLabel('Tom da voz', _speech.pitch, valueUnitNone),
              minLabel: 'Grave',
              maxLabel: 'Agudo',
              progress: ((_speech.pitch - 0.5) / 1.5).clamp(0.0, 1.0),
              values: const [0.7, 0.85, 1.0, 1.15, 1.3],
              selected: _speech.pitch,
              onValue: (v) => _changePitch(v),
              valueFormatter: (v) => v.toStringAsFixed(2),
            ),
            const SizedBox(height: 24),

            // Dicas
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.yellow.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.yellow, width: 3),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '💡 Dicas de Calibração',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '• Aumentar sensibilidade em ambientes com iluminação variável\n'
                    '• Diminuir sensibilidade em ambientes com cores vibrantes\n'
                    '• Usar presets como ponto de partida\n'
                    '• Ajustar velocidade da fala conforme sua preferência',
                    style: TextStyle(color: AppColors.grayLight, fontSize: 13, height: 1.5),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Ações
            Row(
              children: [
                Expanded(
                  child: _amberButton(
                    '🔄 Restaurar Padrão',
                    _reset,
                    background: AppColors.redError,
                    foreground: AppColors.white,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _amberButton(
                    '← Voltar',
                    () => Navigator.of(context).pop(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavBar(
        selectedIndex: 2,
        onTap: (i) => context.go(_navRoutes[i]),
      ),
    );
  }

  Widget _sectionTitle(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.white,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _presetsRow() {
    final presets = const [
      MapEntry('interior', '🏠 Interior'),
      MapEntry('exterior', '☀️ Exterior'),
      MapEntry('low-light', '🌙 Pouca Luz'),
    ];

    return Row(
      children: presets.map((entry) {
        final active = _settings.preset == entry.key;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Semantics(
              label: presetLabel(entry.key),
              selected: active,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: active ? AppColors.yellow : AppColors.grayDark,
                  foregroundColor: active ? AppColors.black : AppColors.white,
                  elevation: 0,
                  side: BorderSide(
                    color: active ? AppColors.black : AppColors.grayMid,
                    width: 2,
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () => _applyPreset(entry.key),
                child: Text(
                  entry.value,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _sliderSection({
    required String title,
    required String valueText,
    required String optionLabel,
    required String minLabel,
    required String maxLabel,
    required double progress,
    required List<double> values,
    required double selected,
    required void Function(double) onValue,
    String Function(double)? valueFormatter,
  }) {
    final formatter = valueFormatter ?? (v) => v.toInt().toString();
    final isClose = (v) => (v - selected).abs() < 0.05;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          label: optionLabel,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                valueText,
                style: const TextStyle(
                  color: AppColors.yellow,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Text(minLabel, style: const TextStyle(color: AppColors.grayLight, fontSize: 12)),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                children: [
                  Container(
                    height: 8,
                    decoration: BoxDecoration(
                      color: AppColors.grayDark,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: AppColors.grayMid, width: 1),
                    ),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: FractionallySizedBox(
                        widthFactor: progress.clamp(0.0, 1.0),
                        child: Container(
                          color: AppColors.yellow,
                          height: 8,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(maxLabel, style: const TextStyle(color: AppColors.grayLight, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: values.map((v) {
            final active = isClose(v);
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.only(right: 6),
                child: Semantics(
                  label: '${title.split(' ')[0]}: ${formatValueForSpeech(v, valueUnitPercent)}',
                  selected: active,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: active ? AppColors.yellow : AppColors.grayDark,
                      foregroundColor: active ? AppColors.black : AppColors.white,
                      elevation: 0,
                      side: BorderSide(
                        color: active ? AppColors.black : AppColors.grayMid,
                        width: 2,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                    ),
                    onPressed: () => _setAndAnnounce(() => onValue(v)),
                    child: Text(
                      formatter(v),
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Future<void> _setAndAnnounce(VoidCallback action) async {
    action();
    // Pequeno feedback sonoro de confirmação (bipe) omitido nesta porta;
    // a mudança é salva e refletida imediatamente na detecção.
  }

  Future<void> _changeSensitivity(int v) async {
    final updated = _settings.copyWith(colorSensitivity: v, preset: 'custom');
    await _saveCalibration(updated);
  }

  Future<void> _changeMinConfidence(int v) async {
    final updated = _settings.copyWith(minConfidence: v, preset: 'custom');
    await _saveCalibration(updated);
  }

  Future<void> _changeRegionSize(int v) async {
    final updated = _settings.copyWith(regionSize: v, preset: 'custom');
    await _saveCalibration(updated);
  }

  Future<void> _changeUpdateFrequency(int v) async {
    final updated = _settings.copyWith(updateFrequency: v, preset: 'custom');
    await _saveCalibration(updated);
  }

  Future<void> _changeSpeechRate(double v) async {
    final updated = _speech.copyWith(rate: v);
    await _saveSpeech(updated);
    await _svc.tts.applySettings(updated);
  }

  Future<void> _changePitch(double v) async {
    final updated = _speech.copyWith(pitch: v);
    await _saveSpeech(updated);
    await _svc.tts.applySettings(updated);
  }

  Future<void> _applyPreset(String presetName) async {
    final preset = CalibrationSettings.presets[presetName];
    if (preset == null) return;
    await _saveCalibration(preset);
    await _svc.tts.speak('Preset ${presetLabel(presetName)} aplicado');
  }

  Future<void> _reset() async {
    await StorageService.resetCalibrationSettings();
    await StorageService.resetSpeechSettings();
    setState(() {
      _settings = CalibrationSettings.defaults;
      _speech = SpeechSettings.defaults;
    });
    await _svc.tts.applySettings(_speech);
    await _svc.tts.speak('Ajustes restaurados para o padrão');
  }

  Future<void> _saveCalibration(CalibrationSettings settings) async {
    await StorageService.saveCalibrationSettings(settings);
    if (!mounted) return;
    setState(() => _settings = settings);
  }

  Future<void> _saveSpeech(SpeechSettings settings) async {
    await StorageService.saveSpeechSettings(settings);
    if (!mounted) return;
    setState(() => _speech = settings);
  }

  Widget _amberButton(
    String label,
    VoidCallback onPressed, {
    Color background = AppColors.yellow,
    Color foreground = AppColors.black,
    double fontSize = 16,
  }) {
    return SizedBox(
      height: 50,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: background,
          foregroundColor: foreground,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: const BorderSide(color: AppColors.black, width: 2),
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
}

/// Rotas da barra inferior, na mesma ordem dos itens de `BottomNavBar`.
const List<String> _navRoutes = [
  '/color-detection',
  '/light-detection',
  '/calibration',
];
