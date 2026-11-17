import 'dart:io';

import 'package:camera/camera.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';

import '../audio/tone_generator.dart';
import '../services/permission_service.dart';

const Color _amareloNeon = Color(0xFFFFE400);
const Color _fundoPreto = Color(0xFF000000);

class LightDetectionScreen extends StatefulWidget {
  const LightDetectionScreen({super.key});

  @override
  State<LightDetectionScreen> createState() => _LightDetectionScreenState();
}

class _LightDetectionScreenState extends State<LightDetectionScreen> {
  CameraController? _controller;
  bool _inicializando = true;
  bool _mediindo = false;
  bool _solicitandoPermissao = true;
  bool _permissaoConcedida = false;

  double _intensidade = 0; // 0 a 100
  int _frequencia = 100; // Hz do apito

  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _somAtivo = false;
  int _frequenciaTocando = 0;

  final FlutterTts _tts = FlutterTts();
  String? _ultimoEstadoFalado; // 'claro' ou 'escuro'

  @override
  void initState() {
    super.initState();
    _solicitarPermissoes();
    _initTts();
  }

  Future<void> _initTts() async {
    await _tts.setLanguage('pt-BR');
    await _tts.setPitch(1.0);
    await _tts.setSpeechRate(0.5);
  }

  /// Fala se o ambiente está claro ou escuro, apenas quando o estado mudar.
  Future<void> _falarClaroOuEscuro(double intensidade) async {
    final estado = intensidade >= 50 ? 'claro' : 'escuro';
    if (estado == _ultimoEstadoFalado) return;
    _ultimoEstadoFalado = estado;
    await _tts.speak('Ambiente $estado');
  }

  Future<void> _solicitarPermissoes() async {
    final service = PermissionService.instance;
    final concedida = await service.requestCamera();
    if (!mounted) return;
    setState(() {
      _permissaoConcedida = concedida;
      _solicitandoPermissao = false;
    });
    if (concedida) {
      _inicializarCamera();
    }
  }

  Future<void> _inicializarCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _inicializando = false);
        return;
      }
      final camera = cameras.where((c) => c.lensDirection == CameraLensDirection.back).firstOrNull ??
          cameras.first;
      _controller = CameraController(
        camera,
        ResolutionPreset.low,
        enableAudio: false,
      );
      await _controller!.initialize();
      if (!mounted) return;
      setState(() => _inicializando = false);
      _medirPeriodicamente();
    } catch (e) {
      if (!mounted) return;
      setState(() => _inicializando = false);
    }
  }

  void _medirPeriodicamente() {
    Future.delayed(const Duration(milliseconds: 600), () async {
      if (!mounted || _controller == null || !_controller!.value.isInitialized) return;
      if (_mediindo) {
        _medirPeriodicamente();
        return;
      }
      await _capturarEMedir();
      _medirPeriodicamente();
    });
  }

  Future<void> _capturarEMedir() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (_mediindo) return;
    setState(() => _mediindo = true);

    try {
      final foto = await controller.takePicture();
      final bytes = await foto.readAsBytes();
      final imagem = img.decodeImage(bytes);
      if (imagem == null) return;

      // Luminância média da região central (amostragem leve)
      final cx = imagem.width ~/ 2;
      final cy = imagem.height ~/ 2;
      final raio = 60;
      double soma = 0;
      int cont = 0;
      for (var y = cy - raio; y <= cy + raio; y += 4) {
        for (var x = cx - raio; x <= cx + raio; x += 4) {
          if (x < 0 || x >= imagem.width || y < 0 || y >= imagem.height) continue;
          final p = imagem.getPixel(x, y);
          soma += 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
          cont++;
        }
      }
      final media = cont > 0 ? soma / cont : 0; // 0..255
      final intensidade = (media / 255 * 100).clamp(0, 100).toDouble();

      // Frequência do apito: luz baixa = grave, luz alta = agudo
      // 0% luz -> 100 Hz, 100% luz -> 1200 Hz
      final frequencia = (100 + intensidade * 11).round();

      if (!mounted) return;
      setState(() {
        _intensidade = intensidade;
        _frequencia = frequencia;
      });

      // Fala claro/escuro automaticamente quando o estado mudar
      _falarClaroOuEscuro(intensidade);

      // Atualiza o apito se a frequência mudou significativamente
      if ((frequencia - _frequenciaTocando).abs() >= 15) {
        _tocarApito(frequencia);
        _frequenciaTocando = frequencia;
      }
    } finally {
      try {
        final dir = await getTemporaryDirectory();
        await File(path.join(dir.path, 'temp_luz.jpg')).delete();
      } catch (_) {}
      if (mounted) setState(() => _mediindo = false);
    }
  }

  Future<void> _tocarApito(int frequencia) async {
    if (_somAtivo) {
      await _audioPlayer.stop();
      _somAtivo = false;
    }
    final wav = ToneGenerator.generateSineWave(frequencia.toDouble(), durationMs: 10000);

    // Repete automaticamente quando termina, enquanto o som estiver ativo
    _audioPlayer.onPlayerComplete.listen((event) {
      if (_somAtivo) {
        _audioPlayer.play(BytesSource(wav));
      }
    });

    await _audioPlayer.play(BytesSource(wav));
    _somAtivo = true;
  }

  @override
  void dispose() {
    _tts.stop();
    _audioPlayer.stop();
    _audioPlayer.dispose();
    _controller?.dispose();
    super.dispose();
  }

  Widget _corpoPermissao() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.camera_alt,
            color: _amareloNeon,
            size: 64,
          ),
          const SizedBox(height: 16),
          const Text(
            'Acesso à câmera não concedido',
            style: TextStyle(
              color: _amareloNeon,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'Permita o uso da câmera para detectar a luz.',
            style: TextStyle(color: Colors.white70),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () async {
              final service = PermissionService.instance;
              final ok = await service.requestCamera();
              if (!mounted) return;
              if (ok) {
                setState(() => _permissaoConcedida = true);
                _inicializarCamera();
              } else {
                await service.openSettings();
              }
            },
            icon: const Icon(Icons.camera),
            label: const Text('Conceder câmera'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _amareloNeon,
              foregroundColor: Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _fundoPreto,
      appBar: AppBar(
        backgroundColor: _fundoPreto,
        foregroundColor: _amareloNeon,
        title: const Text(
          'Detecção de Luz',
          style: TextStyle(fontWeight: FontWeight.bold, color: _amareloNeon),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          color: _amareloNeon,
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _solicitandoPermissao
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation(_amareloNeon),
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Solicitando acesso à câmera...',
                    style: TextStyle(color: _amareloNeon),
                  ),
                ],
              ),
            )
          : !_permissaoConcedida
              ? _corpoPermissao()
              : _inicializando
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation(_amareloNeon),
                      ),
                    )
                  : _controller == null
                      ? const Center(
                          child: Text(
                            'Câmera não disponível',
                            style: TextStyle(color: _amareloNeon),
                          ),
                        )
                      : Stack(
                          children: [
                            // Preview da câmera
                            CameraPreview(_controller!),

                            // Overlay escurecido
                            Container(color: Colors.black.withValues(alpha: 0.4)),

                            // Círculo amarelo com lâmpada no centro da tela
                            Center(
                              child: Container(
                                width: 140,
                                height: 140,
                                decoration: BoxDecoration(
                                  color: _amareloNeon,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: _amareloNeon.withValues(alpha: 0.7),
                                      blurRadius: 30,
                                      spreadRadius: 4,
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.lightbulb,
                                  color: Colors.black,
                                  size: 56,
                                ),
                              ),
                            ),

                            // Resultado da intensidade (abaixo da lâmpada)
                            Positioned(
                              bottom: 140,
                              left: 0,
                              right: 0,
                              child: Column(
                                children: [
                                  Text(
                                    '${_intensidade.round()}%',
                                    style: const TextStyle(
                                      color: _amareloNeon,
                                      fontSize: 56,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  const Text(
                                    'Intensidade de Luz',
                                    style: TextStyle(
                                      color: _amareloNeon,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Apito ativo em quadrado amarelo mais abaixo
                            Positioned(
                              bottom: 50,
                              left: 0,
                              right: 0,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 24,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color: _amareloNeon.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: _amareloNeon.withValues(alpha: 0.6),
                                  ),
                                ),
                                child: const Text(
                                  'Apito ativo: mais grave = menos luz, mais agudo = mais luz',
                                  style: TextStyle(
                                    color: _amareloNeon,
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                          ],
                        ),
    );
  }
}
