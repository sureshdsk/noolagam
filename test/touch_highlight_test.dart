import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:tamil_ebook_reader/features/home/screens/reader_screen.dart';
import 'package:tamil_ebook_reader/services/api/api_client.dart';
import 'package:tamil_ebook_reader/services/api/book_service.dart';
import 'package:tamil_ebook_reader/state/highlights_provider.dart';
import 'package:tamil_ebook_reader/state/reader_prefs_provider.dart';
import 'package:tamil_ebook_reader/state/reading_progress_provider.dart';

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
      return _ok({
        'bookId': 'b1',
        'chapterIdx': int.parse(content.group(1)!),
        'title': 'அத்தியாயம் ${int.parse(content.group(1)!) + 1}',
        'lang': 'ta',
        'contentVersion': 1,
        'blocks': [
          for (var i = 0; i < 40; i++)
            {'t': 'p', 'text': 'பத்தி $i — இது ஒரு நீண்ட பத்தி உரை. ' * 6},
        ],
      });
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

  @override
  void close({bool force = false}) {}
}

bool _paintedTint(WidgetTester tester) {
  for (final element in find.byType(EditableText).evaluate()) {
    final key = element.widget.key;
    if (key is! GlobalKey<EditableTextState>) continue;
    final span = key.currentState?.renderEditable.text;
    if (span == null) continue;
    var found = false;
    void visit(InlineSpan s) {
      if (s is TextSpan) {
        if (s.style?.backgroundColor != null && (s.text ?? '').isNotEmpty) {
          found = true;
        }
        for (final c in s.children ?? const <InlineSpan>[]) {
          visit(c);
        }
      }
    }

    visit(span);
    if (found) return true;
  }
  return false;
}

Future<void> _boot(WidgetTester tester) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final client = ApiClient()..dio.httpClientAdapter = _FakeAdapter();
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ReaderPrefsProvider(prefs)),
        ChangeNotifierProvider(create: (_) => ReadingProgressProvider(prefs)),
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
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  testWidgets('touch long-press word select → highlight → painted tint',
      (WidgetTester tester) async {
    await _boot(tester);
    expect(_paintedTint(tester), isFalse);

    // Finger long-press on a word in the first paragraph (Android touch).
    final word = find.textContaining('பத்தி 0').first;
    final center = tester.getRect(word).center;
    final gesture = await tester.startGesture(center);
    await tester.pump(const Duration(milliseconds: 600));
    await gesture.up();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    // RenderEditable's own long-press recognizer must NOT hijack the
    // gesture: the toolbar with highlight actions has to appear.
    final toolbarBtn = find.text('ஹைலைட்');
    expect(toolbarBtn, findsOneWidget);

    // The in-progress selection must paint with a real background color
    // — a raw EditableText without selectionColor is invisible.
    final editable = tester.widget<EditableText>(
      find.textContaining('பத்தி 0').first,
    );
    expect(editable.selectionColor, isNotNull);
    expect(editable.controller.selection.isCollapsed, false);

    await tester.tap(toolbarBtn);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(_paintedTint(tester), isTrue,
        reason: 'rendered span must paint highlight background');
  });
}
