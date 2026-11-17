import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';

import '../services/permission_service.dart';

const Color _amareloNeon = Color(0xFFFFE400);
const Color _fundoPreto = Color(0xFF000000);

/// Classifica o nome da cor a partir de RGB com precisão aprimorada.
/// Inclui tons como salmão, bege e marrom.
/// Retorna (nome, confiança de 0 a 1, éValido).
/// Se não conseguir classificar com confiança, retorna ("Indefinido", 0, false).
(String nome, double confianca, bool valido) _classificarCor(int r, int g, int b) {
  final max = r > g ? (r > b ? r : b) : (g > b ? g : b);
  final min = r < g ? (r < b ? r : b) : (g < b ? g : b);
  final delta = max - min;
  final brilho = max; // 0..255

  // --- Tons neutros (baixa saturação) ---
  if (delta < 18) {
    if (brilho > 230) return ('Branco', 0.96, true);
    if (brilho > 170) return ('Cinza claro', 0.90, true);
    if (brilho > 100) return ('Cinza médio', 0.88, true);
    if (brilho > 40) return ('Cinza escuro', 0.85, true);
    return ('Preto', 0.92, true);
  }

  final sat = delta / max.clamp(1, 255);

  // Se saturação muito baixa mas não é neutro, não inventar
  if (sat < 0.10) return ('Indefinido', 0.0, false);

  // --- Bege: muito claro, R ligeiramente maior que G e B ---
  if (brilho > 200 && r > g && g >= b && sat < 0.25) {
    final diferenca = (r - b).toDouble();
    if (diferenca > 10 && diferenca < 60) {
      return ('Bege', 0.85, true);
    }
  }

  // --- Marrom: escuro, vermelho dominando, saturação moderada ---
  if (brilho < 140 && r > g && g > b && sat > 0.30) {
    return ('Marrom', 0.82, true);
  }

  // --- Salmão: claro, vermelho forte, verde médio, azul médio-baixo ---
  if (brilho > 150 && r > 200 && g > 80 && g < 180 && b < 160 && r > g && r > b) {
    if (r - g > 40) {
      return ('Salmão', 0.80, true);
    }
  }

  // --- Cores saturadas: calcular matiz (HSV) ---
  double h;
  if (max == r) {
    h = ((g - b) / delta) % 6;
  } else if (max == g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  // Confiança: cores muito saturadas são mais fáceis de classificar com certeza
  final confianca = (0.65 + 0.3 * sat).clamp(0.6, 0.98);

  // Faixas de matiz com limites precisos para evitar "invenção" de cor
  if (h < 10 || h >= 350) return ('Vermelho', confianca, true);
  if (h < 22) {
    return ('Vermelho laranja', confianca, true);
  }
  if (h < 38) return ('Laranja', confianca, true);
  if (h < 50) return ('Laranja amarelo', confianca, true);
  if (h < 62) {
    if (g > r && g > b && b < 140) return ('Amarelo', confianca, true);
    return ('Laranja amarelo', confianca, true);
  }
  if (h < 78) return ('Amarelo esverdeado', confianca, true);
  if (h < 150) return ('Verde', confianca, true);
  if (h < 165) return ('Verde azulado', confianca, true);
  if (h < 190) return ('Ciano', confianca, true);
  if (h < 210) return ('Azul ciano', confianca, true);
  if (h < 250) return ('Azul', confianca, true);
  if (h < 275) return ('Azul violeta', confianca, true);
  if (h < 305) return ('Violeta', confianca, true);
  if (h < 330) return ('Magenta', confianca, true);
  if (h < 350) return ('Rosa magenta', confianca, true);
  return ('Vermelho', confianca, true);
}

/// Extrai RGB médio de uma região quadrada central da imagem.
/// Apenas o que está dentro do quadrado é analisado.
MapEntry<String, int> _mediaRegiaoQuadrado(
  img.Image imagem, {
  int tamanhoQuadrado = 200,
}) {
  final cx = imagem.width ~/ 2;
  final cy = imagem.height ~/ 2;
  final metade = tamanhoQuadrado ~/ 2;

  final x0 = (cx - metade).clamp(0, imagem.width - 1);
  final x1 = (cx + metade).clamp(0, imagem.width - 1);
  final y0 = (cy - metade).clamp(0, imagem.height - 1);
  final y1 = (cy + metade).clamp(0, imagem.height - 1);

  int somaR = 0, somaG = 0, somaB = 0, cont = 0;

  for (var y = y0; y <= y1; y += 2) {
    for (var x = x0; x <= x1; x += 2) {
      final p = imagem.getPixel(x, y);
      somaR += p.r as int;
      somaG += p.g as int;
      somaB += p.b as int;
      cont++;
    }
  }

  if (cont == 0) {
    return const MapEntry('RGB(0, 0, 0)', 0);
  }

  return MapEntry(
    'RGB(${somaR ~/ cont}, ${somaG ~/ cont}, ${somaB ~/ cont})',
    cont,
  );
}

/// Extrai RGB médio de uma string 'RGB(r, g, b)'.
(int, int, int)? _extrairRGB(String texto) {
  final exp = RegExp(r'RGB\((\d+),\s*(\d+),\s*(\d+)\)');
  final m = exp.firstMatch(texto);
  if (m == null) return null;
  return (
    int.parse(m.group(1)!),
    int.parse(m.group(2)!),
    int.parse(m.group(3)!),
  );
}

class ColorIdentificationScreen extends StatefulWidget {
  const ColorIdentificationScreen({super.key});

  @override
  State<ColorIdentificationScreen> createState() => _ColorIdentificationScreenState();
}

class _ColorIdentificationScreenState extends State<ColorIdentificationScreen> {
  CameraController? _controller;
  bool _inicializando = true;
  bool _solicitandoPermissao = true;
  bool _detectando = false;
  bool _permissaoConcedida = false;

  String _corNome = '-';
  double _confianca = 0;
  String _rgb = '-';

  final FlutterTts _tts = FlutterTts();
  String _ultimaCorFalada = '';
  Timer? _detecaoTimer;

  final List<String> _historicoCores = [];
  static const int _janelaEstabilidade = 4;

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

  Future<void> _falarCor(String nomeCor) async {
    // Só fala se a cor mudou (evita repetição)
    if (nomeCor == _ultimaCorFalada || nomeCor == 'Indefinido' || nomeCor == '-') {
      return;
    }
    _ultimaCorFalada = nomeCor;
    await _tts.speak('Cor: $nomeCor');
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
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await _controller!.initialize();
      if (!mounted) return;
      setState(() => _inicializando = false);
      _iniciarDetecaoAutomatica();
    } catch (e) {
      if (!mounted) return;
      setState(() => _inicializando = false);
    }
  }

  void _iniciarDetecaoAutomatica() {
    _detecaoTimer?.cancel();
    _detecaoTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (_controller != null && _controller!.value.isInitialized && !_detectando) {
        _capturarEDetectar();
      }
    });
  }

  Future<void> _capturarEDetectar() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (_detectando) return;
    setState(() => _detectando = true);

    try {
      final foto = await controller.takePicture();
      final bytes = await foto.readAsBytes();
      final imagem = img.decodeImage(bytes);
      if (imagem == null) return;

      // Apenas o que está dentro do quadrado é analisado
      final media = _mediaRegiaoQuadrado(imagem, tamanhoQuadrado: 200);
      final rgbStr = media.key;
      final rgb = _extrairRGB(rgbStr);
      if (rgb == null) return;

      final (nome, confianca, valido) = _classificarCor(rgb.$1, rgb.$2, rgb.$3);

      // Estabilização
      _historicoCores.add(valido ? nome : 'Indefinido');
      if (_historicoCores.length > _janelaEstabilidade) {
        _historicoCores.removeAt(0);
      }

      String nomeEstavel = nome;
      if (_historicoCores.length == _janelaEstabilidade) {
        final contagem = <String, int>{};
        for (final c in _historicoCores) {
          contagem[c] = (contagem[c] ?? 0) + 1;
        }
        final maisComum = contagem.entries.reduce((a, b) => a.value > b.value ? a : b).key;
        final ocorrencias = _historicoCores.where((c) => c == maisComum).length;
        if (ocorrencias >= 3) {
          nomeEstavel = maisComum;
        } else {
          nomeEstavel = 'Indefinido';
        }
      }

      if (!mounted) return;
      setState(() {
        _corNome = nomeEstavel;
        _confianca = valido ? confianca : 0.0;
        _rgb = rgbStr;
      });

      // Fala automaticamente a cor detectada
      if (valido && nomeEstavel != 'Indefinido') {
        _falarCor(nomeEstavel);
      }
    } finally {
      try {
        final dir = await getTemporaryDirectory();
        await File(path.join(dir.path, 'temp_cor.jpg')).delete();
      } catch (_) {}
      if (mounted) setState(() => _detectando = false);
    }
  }

  @override
  void dispose() {
    _detecaoTimer?.cancel();
    _tts.stop();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _fundoPreto,
      appBar: AppBar(
        backgroundColor: _fundoPreto,
        foregroundColor: _amareloNeon,
        title: const Text(
          'Identificação de Cores',
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
              ? Center(
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
                        'Permita o uso da câmera para identificar cores.',
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
                )
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
                            // Preview da câmera (preenche toda a tela)
                            CameraPreview(_controller!),

                            // Overlay escurecido
                            Container(color: Colors.black.withValues(alpha: 0.3)),

                            // Quadrado amarelo no centro — marca o que será identificado
                            Center(
                              child: Container(
                                width: 150,
                                height: 150,
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: _amareloNeon,
                                    width: 4,
                                  ),
                                ),
                              ),
                            ),

                            // Resultado da cor (na parte inferior)
                            Positioned(
                              bottom: 40,
                              left: 0,
                              right: 0,
                              child: Column(
                                children: [
                                  Text(
                                    _corNome,
                                    style: TextStyle(
                                      color: _corNome == 'Indefinido'
                                          ? Colors.grey[500]
                                          : _amareloNeon,
                                      fontSize: 32,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Confiança: ${(_confianca * 100).round()}%',
                                    style: const TextStyle(
                                      color: _amareloNeon,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _rgb,
                                    style: const TextStyle(
                                      color: _amareloNeon,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
    );
  }
}
