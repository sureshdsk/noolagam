import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary — terracotta / burnt sienna (Tamil manuscript palette)
  static const Color primary = Color(0xFFB4552D);
  static const Color primaryDeep = Color(0xFF8A3B1D);
  static const Color button = Color(0xFFC25A2E);
  static const Color accent = Color(0xFFC99A3C);

  // Warm neutrals
  static const Color secondary = Color(0xFFE9DAC0);
  static const Color background = Color(0xFFFAF5EB);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceAlt = Color(0xFFF4ECDD);
  static const Color card = Color(0xFFFFFFFF);

  // Ink
  static const Color textPrimary = Color(0xFF2E2118);
  static const Color textSecondary = Color(0xFF7A6A5B);

  static const Color border = Color(0xFFEBDFCB);

  static const Color success = Color(0xFF3E8E52);
  static const Color error = Color(0xFFC0392B);

  static const LinearGradient emberGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF8A3B1D), Color(0xFFB4552D), Color(0xFFC97B3C)],
  );

  static const LinearGradient parchmentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFFBF2), Color(0xFFF6EBD4)],
  );

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: const Color(0xFF3A2A18).withValues(alpha: 0.08),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: const Color(0xFF3A2A18).withValues(alpha: 0.06),
          blurRadius: 14,
          offset: const Offset(0, 4),
        ),
      ];
}
