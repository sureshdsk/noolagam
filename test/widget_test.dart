import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:tamil_ebook_reader/app.dart';
import 'package:tamil_ebook_reader/state/catalog_provider.dart';
import 'package:tamil_ebook_reader/state/highlights_provider.dart';
import 'package:tamil_ebook_reader/state/jobs_provider.dart';
import 'package:tamil_ebook_reader/state/reader_prefs_provider.dart';
import 'package:tamil_ebook_reader/state/reading_progress_provider.dart';

void main() {
  testWidgets('app boots to splash screen', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final catalog = CatalogProvider();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ReaderPrefsProvider(prefs)),
          ChangeNotifierProvider(create: (_) => ReadingProgressProvider(prefs)),
          ChangeNotifierProvider(create: (_) => HighlightsProvider(prefs)),
          ChangeNotifierProvider.value(value: catalog),
          ChangeNotifierProvider(create: (_) => JobsProvider(prefs)),
        ],
        child: const TamilEbookReaderApp(),
      ),
    );

    expect(find.text('ஓலைச்சுவடி'), findsOneWidget);

    // Fire the splash delay + navigation transition so no timer stays pending.
    await tester.pump(const Duration(seconds: 2));
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('வாசகரே, வணக்கம் 👋'), findsOneWidget);
  });
}
