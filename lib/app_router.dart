import 'package:app_acessibilidade/screens/calibration_screen.dart';
import 'package:app_acessibilidade/screens/color_detection_screen.dart';
import 'package:app_acessibilidade/screens/home_screen.dart';
import 'package:app_acessibilidade/screens/light_detection_screen.dart';
import 'package:go_router/go_router.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/color-detection',
      builder: (context, state) => const ColorDetectionScreen(),
    ),
    GoRoute(
      path: '/light-detection',
      builder: (context, state) => const LightDetectionScreen(),
    ),
    GoRoute(
      path: '/calibration',
      builder: (context, state) => const CalibrationScreen(),
    ),
  ],
);
