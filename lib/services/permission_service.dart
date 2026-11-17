import 'package:permission_handler/permission_handler.dart';

/// Serviço centralizado de permissões do app.
class PermissionService {
  PermissionService._();

  static final PermissionService instance = PermissionService._();

  /// Solicita permissão de câmera. Retorna true se concedida.
  Future<bool> requestCamera() async {
    final status = await Permission.camera.request();
    return status == PermissionStatus.granted;
  }

  /// Solicita permissão de microfone/áudio. Retorna true se concedida.
  Future<bool> requestMicrophone() async {
    final status = await Permission.microphone.request();
    return status == PermissionStatus.granted;
  }

  /// Verifica se a câmera já está autorizada.
  Future<bool> hasCamera() async {
    final status = await Permission.camera.status;
    return status == PermissionStatus.granted;
  }

  /// Verifica se o microfone já está autorizado.
  Future<bool> hasMicrophone() async {
    final status = await Permission.microphone.status;
    return status == PermissionStatus.granted;
  }

  /// Abre as configurações do app para o usuário conceder permissões manualmente.
  Future<void> openSettings() async {
    await openAppSettings();
  }
}
