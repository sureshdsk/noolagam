import 'dart:async' show unawaited;

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart' show BrowserContextMenu;
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'state/catalog_provider.dart';
import 'state/highlights_provider.dart';
import 'state/jobs_provider.dart';
import 'state/reader_prefs_provider.dart';
import 'state/reading_progress_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // On web, the browser's native context menu suppresses Flutter's
  // selection toolbar. Our reader's highlight actions live in that
  // toolbar, so use the Flutter-rendered one everywhere.
  if (kIsWeb) unawaited(BrowserContextMenu.disableContextMenu());

  final prefs = await SharedPreferences.getInstance();
  final catalog = CatalogProvider();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ReaderPrefsProvider(prefs)),
        ChangeNotifierProvider(create: (_) => ReadingProgressProvider(prefs)),
        ChangeNotifierProvider(create: (_) => HighlightsProvider(prefs)),
        ChangeNotifierProvider.value(value: catalog..loadFirstPage()),
        ChangeNotifierProvider(
          create: (_) => JobsProvider(prefs, onCatalogChanged: catalog.refresh),
        ),
      ],
      child: const TamilEbookReaderApp(),
    ),
  );
}
