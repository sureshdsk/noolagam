import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:tamil_ebook_reader/features/home/screens/profile_screen.dart';
import 'package:tamil_ebook_reader/features/home/screens/reader_screen.dart';
import 'package:tamil_ebook_reader/models/highlight.dart';
import 'package:tamil_ebook_reader/state/highlights_provider.dart';
import 'package:tamil_ebook_reader/state/jobs_provider.dart';
import 'package:tamil_ebook_reader/state/reader_prefs_provider.dart';
import 'package:tamil_ebook_reader/state/reading_progress_provider.dart';

void main() {
  late SharedPreferences prefs;
  late HighlightsProvider highlights;
  late ReadingProgressProvider progress;

  Future<void> boot(WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => highlights),
          ChangeNotifierProvider(create: (_) => progress),
          ChangeNotifierProvider(create: (_) => JobsProvider(prefs)),
          ChangeNotifierProvider(create: (_) => ReaderPrefsProvider(prefs)),
        ],
        child: const MaterialApp(home: Scaffold(body: ProfileScreen())),
      ),
    );
    await tester.pumpAndSettle();
  }

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    highlights = HighlightsProvider(prefs);
    progress = ReadingProgressProvider(prefs);

    progress.record(
      bookId: 'b1',
      bookTitle: 'பொன்னியின் செல்வன்',
      totalChapters: 10,
      chapterIdx: 2,
    );
  });

  testWidgets('empty state explains how to create highlights',
      (WidgetTester tester) async {
    await boot(tester);
    expect(find.text('சேமித்த ஹைலைட்கள்'), findsOneWidget);
    expect(find.textContaining('இன்னும் ஹைலைட் இல்லை'), findsOneWidget);
  });

  testWidgets('lists highlights across books, deletes, and opens the reader',
      (WidgetTester tester) async {
    highlights.toggle(Highlight(
      id: 'h1',
      bookId: 'b1',
      chapterIdx: 1,
      blockIdx: 0,
      start: 0,
      end: 10,
      text: 'முதல் ஹைலைட்',
      chapterTitle: 'இரண்டாம் அத்தியாயம்',
      createdAt: DateTime.now(),
    ));
    highlights.toggle(Highlight(
      id: 'h2',
      bookId: 'b1',
      chapterIdx: 0,
      blockIdx: 0,
      start: 0,
      end: 8,
      text: 'இரண்டாம் ஹைலைட்',
      createdAt: DateTime.now(),
    ));
    await boot(tester);

    // Both excerpts visible, ordered by chapter within the book.
    expect(find.textContaining('ஹைலைட்'), findsAtLeastNWidgets(2));
    expect(find.textContaining('முதல்'), findsOneWidget);
    expect(find.textContaining('இரண்டாம்'), findsAtLeastNWidgets(1));

    // Tap opens the reader at the highlighted chapter.
    await tester.tap(find.textContaining('முதல் ஹைலைட்'));
    // Fixed pumps: the reader's indeterminate spinner schedules frames.
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(find.byType(ReaderScreen), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back_rounded), findsOneWidget);

    // Back, then delete from the profile row.
    await tester.tap(find.byIcon(Icons.arrow_back_rounded));
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.tap(find.byIcon(Icons.delete_outline_rounded).first);
    await tester.pump();
    expect(highlights.forBook('b1').length, 1);
  });
}
