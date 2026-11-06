import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/calibration_settings.dart';
import '../models/speech_settings.dart';

/// Persistência de preferências (equivalente ao AsyncStorage do app original).
class StorageService {
  static SharedPreferences? _prefs;

  static Future<SharedPreferences> get _instance async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  static const String _keyCalibration = '@acessibilidade_visual_calibration';
  static const String _keySpeech = '@acessibilidade_visual_speech';

  // -------------------------------------------------------------------------
  // Calibração
  // -------------------------------------------------------------------------

  static Future<CalibrationSettings> loadCalibrationSettings() async {
    final prefs = await _instance;
    final json = prefs.getString(_keyCalibration);
    if (json != null && json.isNotEmpty) {
      try {
        return CalibrationSettings.fromJson(jsonDecode(json) as Map<String, dynamic>);
      } catch (_) {
        // corrompido: volta ao padrão
      }
    }
    return CalibrationSettings.defaults;
  }

  static Future<void> saveCalibrationSettings(CalibrationSettings settings) async {
    final prefs = await _instance;
    await prefs.setString(_keyCalibration, jsonEncode(settings.toJson()));
  }

  static Future<void> resetCalibrationSettings() async {
    final prefs = await _instance;
    await prefs.remove(_keyCalibration);
  }

  // -------------------------------------------------------------------------
  // Fala (TTS)
  // -------------------------------------------------------------------------

  static Future<SpeechSettings> loadSpeechSettings() async {
    final prefs = await _instance;
    final json = prefs.getString(_keySpeech);
    if (json != null && json.isNotEmpty) {
      try {
        return SpeechSettings.fromJson(jsonDecode(json) as Map<String, dynamic>);
      } catch (_) {
      }
    }
    return SpeechSettings.defaults;
  }

  static Future<void> saveSpeechSettings(SpeechSettings settings) async {
    final prefs = await _instance;
    await prefs.setString(_keySpeech, jsonEncode(settings.toJson()));
  }

  static Future<void> resetSpeechSettings() async {
    final prefs = await _instance;
    await prefs.remove(_keySpeech);
  }
}
