import 'package:app_acessibilidade/theme.dart';
import 'package:flutter/material.dart';

/// Logo do app: círculo amarelo com símbolo de câmera em preto, no estilo de
/// alto contraste preto + amarelo do app original.
class AppLogo extends StatelessWidget {
  final double size;
  const AppLogo({super.key, this.size = 96});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.yellow,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.black, width: 4),
      ),
      child: const Center(
        child: Icon(
          Icons.camera_alt,
          color: AppColors.black,
          size: 48,
        ),
      ),
    );
  }
}

/// Texto do nome do app com o estilo de alto contraste.
class AppTitle extends StatelessWidget {
  final double fontSize;
  const AppTitle({super.key, this.fontSize = 30});

  @override
  Widget build(BuildContext context) {
    return Text(
      'Acessibilidade Visual',
      style: TextStyle(
        color: AppColors.white,
        fontSize: fontSize,
        fontWeight: FontWeight.bold,
        shadows: [
          Shadow(blurRadius: 4, color: AppColors.black, offset: const Offset(2, 2)),
        ],
      ),
    );
  }
}
