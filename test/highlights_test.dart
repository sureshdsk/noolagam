import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:tamil_ebook_reader/features/home/widgets/blocks/block_view.dart';
import 'package:tamil_ebook_reader/models/highlight.dart';
import 'package:tamil_ebook_reader/state/highlights_provider.dart';

Highlight _h(
  String id,
  int chapterIdx,
  int blockIdx,
  int start,
  int end, {
  String bookId = 'b1',
  String text = 'excerpt',
}) {
  return Highlight(
    id: id,
    bookId: bookId,
    chapterIdx: chapterIdx,
    blockIdx: blockIdx,
    start: start,
    end: end,
    text: text,
    chapterTitle: 'முதல்',
    createdAt: DateTime.utc(2026, 8, 1),
  );
}

void main() {
  group('Highlight', () {
    test('JSON roundtrip', () {
      final h = _h('h1', 2, 5, 10, 20);
      final restored = Highlight.fromJson(h.toJson());
      expect(restored.id, 'h1');
      expect(restored.bookId, 'b1');
      expect(restored.chapterIdx, 2);
      expect(restored.blockIdx, 5);
      expect(restored.start, 10);
      expect(restored.end, 20);
      expect(restored.chapterTitle, 'முதல்');
      expect(restored.chapterLabel, 'முதல்');
      expect(restored.sameSpot(h), isTrue);
    });

    test('missing fields fall back safely', () {
      final restored = Highlight.fromJson({'id': 'x', 'book_id': 'b1'});
      expect(restored.chapterIdx, 0);
      expect(restored.text, '');
      expect(restored.chapterLabel, 'அத்தியாயம் 1');
    });
  });

  group('HighlightsProvider', () {
    test('toggle adds then removes the same spot', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final provider = HighlightsProvider(prefs);

      provider.toggle(_h('h1', 0, 1, 0, 10));
      expect(provider.forBook('b1').length, 1);
      expect(provider.forBlock('b1', 0, 1).length, 1);
      expect(provider.forBlock('b1', 0, 2), isEmpty);

      // Same spot, different id/text → toggled off.
      provider.toggle(_h('h2', 0, 1, 0, 10, text: 'other'));
      expect(provider.forBook('b1'), isEmpty);
    });

    test('overlapping selections are kept separately until merged at render',
        () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final provider = HighlightsProvider(prefs);

      provider.toggle(_h('h1', 0, 1, 0, 10));
      provider.toggle(_h('h2', 0, 1, 5, 15));
      expect(provider.forBlock('b1', 0, 1).length, 2);
    });

    test('remove by id and removeForBlock', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final provider = HighlightsProvider(prefs);

      provider
        ..toggle(_h('h1', 0, 1, 0, 10))
        ..toggle(_h('h2', 0, 1, 20, 30))
        ..toggle(_h('h3', 1, 0, 0, 5));

      provider.remove('h2');
      expect(provider.forBook('b1').map((h) => h.id), ['h1', 'h3']);

      provider.removeForBlock('b1', 0, 1);
      expect(provider.forBook('b1').map((h) => h.id), ['h3']);
    });

    test('persists across instances', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      HighlightsProvider(prefs).toggle(_h('h1', 3, 2, 0, 4));

      final restored = HighlightsProvider(prefs);
      expect(restored.forBook('b1').single.id, 'h1');
      expect(restored.forBook('b1').single.chapterIdx, 3);
    });
  });

  group('mergedRanges', () {
    test('merges overlapping and adjacent ranges', () {
      final merged = mergedRanges([
        _h('a', 0, 0, 10, 20),
        _h('b', 0, 0, 15, 30),
        _h('c', 0, 0, 30, 40),
      ], 100);
      expect(merged, [(start: 10, end: 40)]);
    });

    test('sorts unsorted input', () {
      final merged = mergedRanges([
        _h('a', 0, 0, 50, 60),
        _h('b', 0, 0, 0, 10),
      ], 100);
      expect(merged, [(start: 0, end: 10), (start: 50, end: 60)]);
    });

    test('clamps out-of-bounds ranges', () {
      final merged = mergedRanges([
        _h('a', 0, 0, -5, 10),
        _h('b', 0, 0, 90, 999),
      ], 100);
      expect(merged, [(start: 0, end: 10), (start: 90, end: 100)]);
    });

    test('drops empty ranges', () {
      expect(mergedRanges([_h('a', 0, 0, 7, 7)], 100), isEmpty);
      expect(mergedRanges([_h('a', 0, 0, 5, 3)], 100), isEmpty);
    });
  });
}
