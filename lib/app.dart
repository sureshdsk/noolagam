import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'features/splash/splash_screen.dart';

class TamilEbookReaderApp extends StatelessWidget {
  const TamilEbookReaderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'ஓலைச்சுவடி',
      theme: AppTheme.lightTheme,
      home: const SplashScreen(),
    );
  }
}
