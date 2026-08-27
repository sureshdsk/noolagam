import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/theme/reader_palette.dart';

/// Reader display preferences (font size + theme), persisted locally.
class ReaderPrefsProvider extends ChangeNotifier {
  static const _kFontSize = 'reader_font_size';
  static const _kThemeMode = 'reader_theme_mode';

  ReaderPrefsProvider(this._prefs) {
    _fontSize = _prefs.getDouble(_kFontSize) ?? 20;
    final name = _prefs.getString(_kThemeMode);
    _themeMode = ReaderThemeMode.values.where((m) => m.name == name).isEmpty
        ? ReaderThemeMode.light
        : ReaderThemeMode.values.firstWhere((m) => m.name == name);
  }

  final SharedPreferences _prefs;

  late double _fontSize;
  late ReaderThemeMode _themeMode;

  static const double minFontSize = 16;
  static const double maxFontSize = 48;

  double get fontSize => _fontSize;
  ReaderThemeMode get themeMode => _themeMode;
  ReaderPalette get palette => _themeMode.palette;

  void changeFontSize(double delta) {
    final next = (_fontSize + delta).clamp(minFontSize, maxFontSize);
    if (next == _fontSize) return;
    _fontSize = next;
    _prefs.setDouble(_kFontSize, _fontSize);
    notifyListeners();
  }

  void cycleTheme() {
    _themeMode = readerThemeNext(_themeMode);
    _prefs.setString(_kThemeMode, _themeMode.name);
    notifyListeners();
  }
}
