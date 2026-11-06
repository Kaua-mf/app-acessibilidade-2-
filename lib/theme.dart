import 'package:flutter/material.dart';

/// Cores do app — espelham o design original (preto + amarelo de alta
/// contraste, pensado para acessibilidade visual).
class AppColors {
  static const Color black = Color(0xFF000000);
  static const Color yellow = Color(0xFFFFFF00);
  static const Color white = Color(0xFFFFFFFF);
  static const Color grayDark = Color(0xFF333333);
  static const Color grayMid = Color(0xFF666666);
  static const Color grayLight = Color(0xFFCCCCCC);
  static const Color redError = Color(0xFFFF6B6B);
  static const Color surface = Color(0xFF111111);
}

/// Tema único do app (escuro por padrão, fundo preto).
ThemeData appTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.black,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.yellow,
      secondary: AppColors.yellow,
      surface: AppColors.surface,
      onPrimary: AppColors.black,
      onSurface: AppColors.white,
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        color: AppColors.white,
        fontSize: 32,
        fontWeight: FontWeight.bold,
        shadows: [Shadow(blurRadius: 4, color: AppColors.black, offset: Offset(2, 2))],
      ),
      titleLarge: TextStyle(
        color: AppColors.white,
        fontSize: 24,
        fontWeight: FontWeight.bold,
        shadows: [Shadow(blurRadius: 4, color: AppColors.black, offset: Offset(2, 2))],
      ),
      bodyLarge: TextStyle(color: AppColors.white, fontSize: 16),
      bodyMedium: TextStyle(color: AppColors.white, fontSize: 14),
      labelLarge: TextStyle(color: AppColors.black, fontSize: 16, fontWeight: FontWeight.bold),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.yellow,
        foregroundColor: AppColors.black,
        elevation: 0,
        shadowColor: AppColors.black,
      ),
    ),
  );
}
