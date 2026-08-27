import 'package:flutter_test/flutter_test.dart';

import 'package:tamil_ebook_reader/features/home/reader/paginator.dart';

void main() {
  group('paginateItems', () {
    test('empty content yields a single empty page', () {
      expect(
        paginateItems(itemHeights: const [], pageHeight: 400),
        const <List<int>>[<int>[]],
      );
    });

    test('packs items until the next one would overflow', () {
      final pages = paginateItems(
        itemHeights: const [100, 100, 100],
        pageHeight: 250,
      );
      expect(pages, [
        [0, 1],
        [2],
      ]);
    });

    test('exact fit keeps items on the same page', () {
      final pages = paginateItems(
        itemHeights: const [100, 100],
        pageHeight: 200,
      );
      expect(pages, [
        [0, 1],
      ]);
    });

    test('item taller than the page becomes its own page', () {
      final pages = paginateItems(
        itemHeights: const [100, 400, 100],
        pageHeight: 250,
      );
      expect(pages, [
        [0],
        [1],
        [2],
      ]);
    });

    test('larger font (taller items) produces more pages', () {
      final small = paginateItems(
        itemHeights: List.filled(10, 40),
        pageHeight: 200,
      );
      final large = paginateItems(
        itemHeights: List.filled(10, 80),
        pageHeight: 200,
      );
      expect(small.length, 2); // 5 per page
      expect(large.length, 5); // 2 per page
      expect(large.length, greaterThan(small.length));
    });

    test('every item appears exactly once in order', () {
      final heights = [30.0, 900.0, 45.0, 60.0, 500.0, 20.0];
      final pages = paginateItems(itemHeights: heights, pageHeight: 120);
      final flat = pages.expand((p) => p).toList();
      expect(flat, [for (var i = 0; i < heights.length; i++) i]);
      for (final page in pages) {
        expect(page, isNotEmpty);
      }
    });
  });

  group('pageContainingItem', () {
    final pages = [
      [0, 1],
      [2, 3],
      [4],
    ];

    test('finds the owning page', () {
      expect(pageContainingItem(pages, 0), 0);
      expect(pageContainingItem(pages, 3), 1);
      expect(pageContainingItem(pages, 4), 2);
    });

    test('out-of-range and negative items fall back to edges', () {
      expect(pageContainingItem(pages, 99), 2);
      expect(pageContainingItem(pages, -1), 0);
    });
  });
}
