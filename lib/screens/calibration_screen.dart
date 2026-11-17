import 'package:flutter/material.dart';

class CalibrationScreen extends StatefulWidget {
  const CalibrationScreen({super.key});

  @override
  State<CalibrationScreen> createState() => _CalibrationScreenState();
}

class _CalibrationScreenState extends State<CalibrationScreen> {
  String _presetSelecionado = 'Pouca Luz';

  double _sensibilidadeCores = 80;
  double _confiancaMinima = 50;
  double _tamanhoRegulagem = 30;

  static const List<String> _presets = ['Interior', 'Exterior', 'Pouca Luz'];

  void _aplicarPreset(String preset) {
    setState(() {
      _presetSelecionado = preset;
      switch (preset) {
        case 'Interior':
          _sensibilidadeCores = 70;
          _confiancaMinima = 60;
          _tamanhoRegulagem = 20;
          break;
        case 'Exterior':
          _sensibilidadeCores = 90;
          _confiancaMinima = 70;
          _tamanhoRegulagem = 25;
          break;
        case 'Pouca Luz':
          _sensibilidadeCores = 80;
          _confiancaMinima = 50;
          _tamanhoRegulagem = 30;
          break;
      }
    });
  }

  Widget _botaoPreset(String label) {
    final selecionado = _presetSelecionado == label;
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: ElevatedButton(
          onPressed: () => _aplicarPreset(label),
          style: ElevatedButton.styleFrom(
            backgroundColor: selecionado ? const Color(0xFFFFE400) : Colors.grey[850],
            foregroundColor: selecionado ? Colors.black : Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: selecionado ? Colors.black : Colors.white,
            ),
          ),
        ),
      ),
    );
  }

  Widget _blocoControle({
    required String titulo,
    required String valor,
    required double valorSlider,
    required double min,
    required double max,
    required int divisions,
    required List<int> atalhos,
    required ValueChanged<double> onChanged,
  }) {
    final amarelo = const Color(0xFFFFE400);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              titulo,
              style: const TextStyle(
                color: Color(0xFFFFE400),
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              valor,
              style: const TextStyle(
                color: Color(0xFFFFE400),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Slider(
          value: valorSlider,
          min: min,
          max: max,
          divisions: divisions,
          label: valorSlider.round().toString(),
          onChanged: onChanged,
          activeColor: amarelo,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: atalhos.map((a) {
            final ativo = a.round() == valorSlider.round();
            return ChoiceChip(
              label: Text(a.toString()),
              selected: ativo,
              onSelected: (_) => onChanged(a.toDouble()),
              selectedColor: amarelo,
              labelStyle: TextStyle(
                color: ativo ? Colors.black : Colors.white,
                fontWeight: FontWeight.bold,
              ),
              backgroundColor: Colors.grey[850],
            );
          }).toList(),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final amarelo = const Color(0xFFFFE400);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: amarelo,
        title: const Text(
          'Calibração',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          color: amarelo,
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Título e descrição
            const Text(
              'Calibração',
              style: TextStyle(
                color: Color(0xFFFFE400),
                fontSize: 26,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Calibrado para ambientes com baixa iluminação',
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 24),

            // Presets Rápidos
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[900],
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: amarelo.withValues(alpha: 0.5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Presets Rápidos',
                    style: TextStyle(
                      color: Color(0xFFFFE400),
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: _presets.map((p) => _botaoPreset(p)).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Sensibilidade de Cores
            _blocoControle(
              titulo: 'Sensibilidade de Cores',
              valor: '${_sensibilidadeCores.round()}%',
              valorSlider: _sensibilidadeCores,
              min: 0,
              max: 100,
              divisions: 20,
              atalhos: const [0, 25, 50, 75, 100],
              onChanged: (v) => setState(() => _sensibilidadeCores = v),
            ),
            const SizedBox(height: 24),

            // Confiança Mínima
            _blocoControle(
              titulo: 'Confiança Mínima',
              valor: '${_confiancaMinima.round()}%',
              valorSlider: _confiancaMinima,
              min: 0,
              max: 100,
              divisions: 20,
              atalhos: const [30, 50, 70, 85, 100],
              onChanged: (v) => setState(() => _confiancaMinima = v),
            ),
            const SizedBox(height: 24),

            // Tamanho da Regulagem
            _blocoControle(
              titulo: 'Tamanho da Regulagem',
              valor: '${_tamanhoRegulagem.round()}px',
              valorSlider: _tamanhoRegulagem,
              min: 10,
              max: 50,
              divisions: 20,
              atalhos: const [12, 15, 20, 30, 40],
              onChanged: (v) => setState(() => _tamanhoRegulagem = v),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
