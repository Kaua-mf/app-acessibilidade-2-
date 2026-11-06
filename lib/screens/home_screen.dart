import 'package:app_acessibilidade/theme.dart';
import 'package:app_acessibilidade/widgets/app_logo.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Tela inicial (Home). Espelha o `index.tsx` do app original: logo do app,
/// dois botões grandes de alta contraste (amarelo sobre preto) e barra
/// inferior com 3 atalhos.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.black,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const AppLogo(size: 100),
                    const SizedBox(height: 24),
                    const AppTitle(fontSize: 32),
                    const SizedBox(height: 8),
                    const Text(
                      'Escolha uma função abaixo.',
                      style: TextStyle(color: AppColors.grayLight, fontSize: 16),
                    ),
                    const SizedBox(height: 32),
                    _bigButton(
                      '🎨 Identificação de Cores',
                      'Detecte e identifique cores em tempo real pela câmera.',
                      () => context.push('/color-detection'),
                    ),
                    const SizedBox(height: 16),
                    _bigButton(
                      '💡 Detecção de Luz',
                      'Ouça um apito que muda conforme a intensidade de luz.',
                      () => context.push('/light-detection'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bigButton(String title, String subtitle, VoidCallback onPressed) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.yellow,
          foregroundColor: AppColors.black,
          minimumSize: const Size(double.infinity, 64),
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.black, width: 4),
          ),
        ),
        onPressed: onPressed,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
