import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/gestures.dart' show PointerDeviceKind;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:tamil_ebook_reader/features/home/screens/reader_screen.dart';
import 'package:tamil_ebook_reader/models/highlight.dart';
import 'package:tamil_ebook_reader/services/api/api_client.dart';
import 'package:tamil_ebook_reader/services/api/book_service.dart';
import 'package:tamil_ebook_reader/state/highlights_provider.dart';
import 'package:tamil_ebook_reader/state/reader_prefs_provider.dart';
import 'package:tamil_ebook_reader/state/reading_progress_provider.dart';

/// Serves two chapters of paragraph blocks through a fake HTTP layer so
/// the paginated reader can be exercised end to end.
class _FakeAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final path = options.uri.path;
    final presign = RegExp(r'/books/[^/]+/chapters/(\d+)$').firstMatch(path);
    if (presign != null) {
      return _ok({'url': 'https://fake.local/chapters/${presign.group(1)}'});
    }
    final content = RegExp(r'/chapters/(\d+)$').firstMatch(path);
    if (content != null) {
      return _ok(_chapterJson(int.parse(content.group(1)!)));
    }
    throw StateError('unexpected request: $path');
  }

  static ResponseBody _ok(Map<String, dynamic> json) {
    return ResponseBody.fromString(
      jsonEncode(json),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  static Map<String, dynamic> _chapterJson(int idx) {
    return {
      'bookId': 'b1',
      'chapterIdx': idx,
      'title': 'அத்தியாயம் ${idx + 1}',
      'lang': 'ta',
      'contentVersion': 1,
      'blocks': [
        for (var i = 0; i < 40; i++)
          {'t': 'p', 'text': 'பத்தி $i — இது ஒரு நீண்ட பத்தி உரை. ' * 6},
      ],
    };
  }

  @override
  void close({bool force = false}) {}
}

int _pageCountOf(WidgetTester tester) {
  final subtitle =
      tester.widget<Text>(find.textContaining('பக்கம்')).data as String;
  return int.parse(RegExp(r'/ (\d+)$').firstMatch(subtitle)!.group(1)!);
}

int _chapterOf(WidgetTester tester) {
  final subtitle = tester
      .widget<Text>(find.textContaining(RegExp('அத்தியாயம் \\d+ /')))
      .data as String;
  return int.parse(RegExp(r'அத்தியாயம் (\d+)').firstMatch(subtitle)!.group(1)!);
}

Future<void> _settleReader(WidgetTester tester) async {
  // Fixed-duration pumps: the indeterminate spinners would make
  // pumpAndSettle run forever.
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  testWidgets('paginates by font size, tracks pages, chains chapters',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final readerPrefs = ReaderPrefsProvider(prefs);
    final progress = ReadingProgressProvider(prefs);

    final client = ApiClient();
    client.dio.httpClientAdapter = _FakeAdapter();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => readerPrefs),
          ChangeNotifierProvider(create: (_) => progress),
          ChangeNotifierProvider(create: (_) => HighlightsProvider(prefs)),
        ],
        child: MaterialApp(
          home: ReaderScreen(
            bookId: 'b1',
            bookTitle: 'நூல்',
            totalChapters: 2,
            service: BookService(client: client),
          ),
        ),
      ),
    );
    await _settleReader(tester);

    // Content is paginated into multiple pages, progress starts at
    // chapter 1, page 1.
    final initialPages = _pageCountOf(tester);
    expect(initialPages, greaterThan(1));
    expect(_chapterOf(tester), 1);
    expect(progress.forBook('b1')!.lastPageIdx, 0);
    expect(progress.forBook('b1')!.lastPageCount, initialPages);

    // Edge tap turns a page and records page-granular progress.
    await tester.tap(find.byIcon(Icons.chevron_right_rounded));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump(const Duration(milliseconds: 100));
    expect(_pageCountOf(tester), initialPages);
    expect(progress.forBook('b1')!.lastPageIdx, 1);

    // Larger font → taller items → strictly more pages, and the reader
    // re-anchors near the same content instead of jumping away.
    final firstPageText = find.textContaining('பத்தி 1');
    expect(firstPageText, findsOneWidget);
    readerPrefs.changeFontSize(24); // 20 → 44
    await _settleReader(tester);
    expect(_pageCountOf(tester), greaterThan(initialPages));
    expect(find.textContaining('பக்கம்'), findsOneWidget);

    // Smaller font → fewer pages again.
    readerPrefs.changeFontSize(-24); // 44 → 20
    await _settleReader(tester);
    expect(_pageCountOf(tester), initialPages);

    // Turn through to the end of chapter 1 and chain into chapter 2.
    var guard = 60;
    while (_chapterOf(tester) == 1 && guard-- > 0) {
      await tester.tap(find.byIcon(Icons.chevron_right_rounded));
      await tester.pump(const Duration(milliseconds: 450));
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(_chapterOf(tester), 2);
    expect(_pageCountOf(tester), greaterThan(0));
    expect(progress.forBook('b1')!.lastChapterIdx, 1);
  });

  testWidgets('highlights render, jump, survive font changes, and delete',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final readerPrefs = ReaderPrefsProvider(prefs);
    final progress = ReadingProgressProvider(prefs);
    final highlights = HighlightsProvider(prefs);

    // Seed a whole-paragraph highlight on chapter 2, paragraph 3.
    final para3 = 'பத்தி 3 — இது ஒரு நீண்ட பத்தி உரை. ' * 6;
    highlights.toggle(Highlight(
      id: 'h1',
      bookId: 'b1',
      chapterIdx: 1,
      blockIdx: 3,
      start: 0,
      end: para3.length,
      text: para3,
      chapterTitle: 'அத்தியாயம் 2',
      createdAt: DateTime.now(),
    ));

    final client = ApiClient();
    client.dio.httpClientAdapter = _FakeAdapter();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => readerPrefs),
          ChangeNotifierProvider(create: (_) => progress),
          ChangeNotifierProvider(create: (_) => highlights),
        ],
        child: MaterialApp(
          home: ReaderScreen(
            bookId: 'b1',
            bookTitle: 'நூல்',
            totalChapters: 2,
            service: BookService(client: client),
          ),
        ),
      ),
    );
    await _settleReader(tester);

    // Header button present.
    expect(find.byIcon(Icons.bookmark_border_rounded), findsOneWidget);

    Future<void> openSheet() async {
      await tester.tap(find.byIcon(Icons.bookmark_border_rounded));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));
    }

    Finder sheetExcerpt() => find.descendant(
          of: find.byType(BottomSheet),
          matching: find.textContaining('பத்தி 3 —'),
        );

    // Open the sheet and jump to the highlight.
    await openSheet();
    expect(sheetExcerpt(), findsOneWidget);
    await tester.tap(sheetExcerpt());
    await tester.pump(const Duration(milliseconds: 300));
    await _settleReader(tester);

    expect(_chapterOf(tester), 2);
    expect(find.textContaining('பத்தி 3 —'), findsWidgets);

    // The highlighted paragraph renders with a tinted span.
    final tinted = _hasTintedSpan(tester, 'பத்தி 3 —');
    expect(tinted, isTrue);

    // Reflow with a bigger font, then jump again — the highlight still
    // lands on the page that currently contains the paragraph.
    readerPrefs.changeFontSize(24); // 20 → 44
    await _settleReader(tester);
    final pagesAtLargeFont = _pageCountOf(tester);
    expect(pagesAtLargeFont, greaterThan(1));

    await openSheet();
    await tester.tap(sheetExcerpt());
    await tester.pump(const Duration(milliseconds: 300));
    await _settleReader(tester);
    expect(_chapterOf(tester), 2);
    expect(find.textContaining('பத்தி 3 —'), findsWidgets);
    expect(_hasTintedSpan(tester, 'பத்தி 3 —'), isTrue);

    // Delete from the sheet → empty state and badge disappears.
    await openSheet();
    await tester.tap(find.byIcon(Icons.delete_outline_rounded));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.textContaining('இன்னும் ஹைலைட் இல்லை'), findsOneWidget);
    expect(highlights.forBook('b1'), isEmpty);
  });

  testWidgets('late font loads and text scale changes re-paginate, pages never scroll vertically',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final readerPrefs = ReaderPrefsProvider(prefs);
    final progress = ReadingProgressProvider(prefs);
    final highlights = HighlightsProvider(prefs);

    final client = ApiClient();
    client.dio.httpClientAdapter = _FakeAdapter();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => readerPrefs),
          ChangeNotifierProvider(create: (_) => progress),
          ChangeNotifierProvider(create: (_) => highlights),
        ],
        child: MaterialApp(
          home: ReaderScreen(
            bookId: 'b1',
            bookTitle: 'நூல்',
            totalChapters: 2,
            service: BookService(client: client),
          ),
        ),
      ),
    );
    await _settleReader(tester);

    final initialPages = _pageCountOf(tester);

    // Normal pages are clipped columns — no vertical scrollable exists
    // in the reader at rest, so no page can ever scroll or show a
    // scrollbar (content here has no tables / oversized items).
    expect(find.byType(SingleChildScrollView), findsNothing);

    // Fonts landing after measurement (web) must trigger a re-measure:
    // the reader stays on the same page and content across the reflow.
    final subtitleBefore = tester
        .widget<Text>(find.textContaining('பக்கம்'))
        .data as String;
    await tester.binding
        .handleSystemMessage(const {'type': 'fontsChanged'});
    await _settleReader(tester);
    expect(_pageCountOf(tester), initialPages);
    expect(
      tester.widget<Text>(find.textContaining('பக்கம்')).data as String,
      subtitleBefore,
      reason: 'font-change reflow must re-anchor to the same page',
    );
    expect(find.byType(SingleChildScrollView), findsNothing);

    // Larger system text scale → taller items → strictly more pages.
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    await _settleReader(tester);
    expect(_pageCountOf(tester), greaterThan(initialPages));
    expect(find.byType(SingleChildScrollView), findsNothing);

    // Back to no scaling → original pagination returns.
    tester.platformDispatcher.clearTextScaleFactorTestValue();
    await _settleReader(tester);
    expect(_pageCountOf(tester), initialPages);
  });

  testWidgets('mouse drag selection opens the highlight toolbar and saves',
      (WidgetTester tester) async {
    // Regression test for web/desktop: SelectableText never showed the
    // toolbar after a mouse drag, making highlights unreachable there.
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final readerPrefs = ReaderPrefsProvider(prefs);
    final progress = ReadingProgressProvider(prefs);
    final highlights = HighlightsProvider(prefs);

    final client = ApiClient();
    client.dio.httpClientAdapter = _FakeAdapter();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => readerPrefs),
          ChangeNotifierProvider(create: (_) => progress),
          ChangeNotifierProvider(create: (_) => highlights),
        ],
        child: MaterialApp(
          home: ReaderScreen(
            bookId: 'b1',
            bookTitle: 'நூல்',
            totalChapters: 2,
            service: BookService(client: client),
          ),
        ),
      ),
    );
    await _settleReader(tester);

    // Mouse drag across the first paragraph to select part of it.
    final paragraph = find.textContaining('பத்தி 0 —').first;
    final rect = tester.getRect(paragraph);
    final gesture = await tester.startGesture(
      rect.centerLeft + const Offset(8, 0),
      kind: PointerDeviceKind.mouse,
    );
    await gesture.moveBy(const Offset(172, 0));
    await tester.pump();
    await gesture.up();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // The toolbar with highlight actions appears without long-press.
    final highlightBtn = find.text('ஹைலைட்');
    expect(highlightBtn, findsOneWidget);

    // Save the selection → provider records a content-anchored highlight
    // and the paragraph re-renders with a tinted span.
    await tester.tap(highlightBtn);
    await tester.pump(const Duration(milliseconds: 100));
    final saved = highlights.forBook('b1');
    expect(saved.length, 1);
    expect(saved.single.chapterIdx, 0);
    expect(saved.single.blockIdx, 0);
    expect(saved.single.start, greaterThanOrEqualTo(0));
    expect(saved.single.end, greaterThan(saved.single.start));
    expect(_hasTintedSpan(tester, 'பத்தி 0'), isTrue);
  });
}

/// Whether any rendered paragraph showing [needle] paints with a
/// highlight-colored span. Checks the span actually given to
/// RenderEditable (the painted one), not just the controller's output.
bool _hasTintedSpan(WidgetTester tester, String needle) {
  for (final element in find.byType(EditableText).evaluate()) {
    final key = element.widget.key;
    if (key is! GlobalKey<EditableTextState>) continue;
    final state = key.currentState;
    final span = state?.renderEditable.text;
    if (span == null) continue;
    if (_spanTreeContains(span, needle) && _spanTreeHasBackground(span)) {
      return true;
    }
  }
  return false;
}

bool _spanTreeContains(InlineSpan span, String needle) {
  var found = false;
  span.visitChildren((child) {
    if (child is TextSpan && child.text != null && child.text!.contains(needle)) {
      found = true;
    }
    return !found;
  });
  if (!found && span is TextSpan && span.text != null) {
    found = span.text!.contains(needle);
  }
  return found;
}

bool _spanTreeHasBackground(InlineSpan span) {
  var found = false;
  if (span is TextSpan) {
    if (span.style?.backgroundColor != null) found = true;
    for (final child in span.children ?? const <InlineSpan>[]) {
      if (_spanTreeHasBackground(child)) found = true;
    }
  }
  return found;
}
