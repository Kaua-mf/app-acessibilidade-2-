import 'package:app_acessibilidade/app_router.dart';
import 'package:app_acessibilidade/app_services.dart';
import 'package:app_acessibilidade/theme.dart';
import 'package:flutter/material.dart';

void main() {
  runApp(const AcessibilidadeApp());
}

class AcessibilidadeApp extends StatefulWidget {
  const AcessibilidadeApp({super.key});

  @override
  State<AcessibilidadeApp> createState() => _AcessibilidadeAppState();
}

class _AcessibilidadeAppState extends State<AcessibilidadeApp> {
  @override
  void initState() {
    super.initState();
    AppServices.instance.init();
  }

  @override
  void dispose() {
    AppServices.instance.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Acessibilidade Visual',
      routerConfig: appRouter,
      theme: appTheme(),
      darkTheme: appTheme(),
      themeMode: ThemeMode.dark,
      debugShowCheckedModeBanner: false,
    );
  }
}
