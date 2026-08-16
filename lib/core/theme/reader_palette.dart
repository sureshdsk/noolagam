import 'package:flutter/material.dart';

import 'app_colors.dart';
enum ReaderThemeMode { light, sepia, dark }

ReaderThemeMode readerThemeNext(ReaderThemeMode m) =>
    switch (m) { ReaderThemeMode.light => ReaderThemeMode.sepia, ReaderThemeMode.sepia => ReaderThemeMode.dark, ReaderThemeMode.dark => ReaderThemeMode.light };

/// Reader surface palette. Separate from the app theme so the reading
/// experience can be light / sepia / dark independent of the rest of the UI.
class ReaderPalette {
  final Color background;
  final Color text;
  final Color secondary;
  final Color accent;
  final Color surface;
  final Color quoteBackground;

  const ReaderPalette({
    required this.background,
    required this.text,
    required this.secondary,
    required this.accent,
    required this.surface,
    required this.quoteBackground,
  });
}

extension ReaderPaletteX on ReaderThemeMode {
  ReaderPalette get palette => switch (this) {
        ReaderThemeMode.light => const ReaderPalette(
            background: Color(0xFFFDF9F0),
            text: Color(0xFF33261D),
            secondary: Color(0xFF6B584C),
            accent: AppColors.primary,
            surface: Color(0xFFF3EADC),
            quoteBackground: Color(0xFFF3EADC),
          ),
        ReaderThemeMode.sepia => const ReaderPalette(
            background: Color(0xFFE9DCC5),
            text: Color(0xFF40311F),
            secondary: Color(0xFF6B584C),
            accent: Color(0xFF8C5A2B),
            surface: Color(0xFFDFCFAF),
            quoteBackground: Color(0xFFDFCFAF),
          ),
        ReaderThemeMode.dark => const ReaderPalette(
            background: Color(0xFF1E1913),
            text: Color(0xFFEDE4D8),
            secondary: Color(0xFFB5A795),
            accent: Color(0xFFD89468),
            surface: Color(0xFF2A241C),
            quoteBackground: Color(0xFF2A241C),
          ),
      };

  String get label => switch (this) {
        ReaderThemeMode.light => 'வெளிச்சம்',
        ReaderThemeMode.sepia => 'செப்பியா',
        ReaderThemeMode.dark => 'இருள்',
      };

  IconData get icon => switch (this) {
        ReaderThemeMode.light => Icons.light_mode_rounded,
        ReaderThemeMode.sepia => Icons.auto_stories_rounded,
        ReaderThemeMode.dark => Icons.dark_mode_rounded,
      };

  bool get isDark => this == ReaderThemeMode.dark;
}
