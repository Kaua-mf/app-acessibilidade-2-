import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';

import 'screens/color_identification_screen.dart';
import 'screens/light_detection_screen.dart';
import 'screens/calibration_screen.dart';

void main() {
  runApp(const OlhoAmigoApp());
}

class OlhoAmigoApp extends StatelessWidget {
  const OlhoAmigoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OlhoAmigo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: const ColorScheme.dark(
          background: Color(0xFF000000),
          surface: Color(0xFF121212),
          primary: Color(0xFFFFE400),
          onPrimary: Colors.black,
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF000000),
      ),
      home: const HomePage(),
      routes: {
        '/color': (_) => const ColorIdentificationScreen(),
        '/light': (_) => const LightDetectionScreen(),
        '/calibracao': (_) => const CalibrationScreen(),
      },
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;

  static const List<Widget> _telas = <Widget>[
    _HomeConteudo(),
    ColorIdentificationScreen(),
    LightDetectionScreen(),
    CalibrationScreen(),
  ];

  void _onItemTapped(int index) {
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _telas[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        backgroundColor: Colors.black,
        selectedItemColor: const Color(0xFFFFE400),
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.color_lens),
            label: 'Cores',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.brightness_7),
            label: 'Luz',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.tune),
            label: 'Calibração',
          ),
        ],
      ),
      // Sem botão flutuante de voz — o app fala automaticamente nas telas de cores e luz.
      floatingActionButton: null,
    );
  }
}

class _HomeConteudo extends StatelessWidget {
  const _HomeConteudo();

  @override
  Widget build(BuildContext context) {
    final amarelo = const Color(0xFFFFE400);

    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: amarelo,
        centerTitle: true,
        title: Image.asset(
          'assets/images/logomenor.jpg',
          height: 56,
          fit: BoxFit.contain,
        ),
        actions: const [],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Cartão: Identificação de Cores
            _CartaoAcao(
              titulo: 'Identificação de Cores',
              subtitulo: 'Detecta e identifica cores em tempo real',
              icone: Icons.color_lens,
              cor: amarelo,
              textoCor: Colors.black,
              onTap: () => Navigator.pushNamed(context, '/color'),
            ),
            const SizedBox(height: 24),

            // Cartão: Detecção de Luz
            _CartaoAcao(
              titulo: 'Detecção de luz',
              subtitulo: 'Informa se o ambiente está claro ou escuro',
              icone: Icons.brightness_7,
              cor: amarelo,
              textoCor: Colors.black,
              onTap: () => Navigator.pushNamed(context, '/light'),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

class _CartaoAcao extends StatelessWidget {
  final String titulo;
  final String subtitulo;
  final IconData icone;
  final Color cor;
  final Color textoCor;
  final VoidCallback onTap;

  const _CartaoAcao({
    required this.titulo,
    required this.subtitulo,
    required this.icone,
    required this.cor,
    required this.textoCor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: cor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: cor.withValues(alpha: 0.45),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icone, color: cor, size: 34),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    titulo,
                    style: TextStyle(
                      color: textoCor,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitulo,
                    style: TextStyle(
                      color: textoCor.withValues(alpha: 0.85),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: textoCor, size: 30),
          ],
        ),
      ),
    );
  }
}
