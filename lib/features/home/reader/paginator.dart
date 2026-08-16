/// Whole-item pagination for the block-model reader.
///
/// Chapter content (title + blocks) is measured as discrete items, then
/// greedily packed into fixed-height pages. Re-running pagination whenever
/// the font size or viewport changes makes the page count grow or shrink
/// with the layout — no vertical scrolling inside a chapter.
library;

/// Packs [itemHeights] into pages of at most [pageHeight].
///
/// Items are never split: an item that no longer fits closes the current
/// page and starts the next one. An item taller than [pageHeight] becomes
/// a single-item page — render those with internal scrolling.
List<List<int>> paginateItems({
  required List<double> itemHeights,
  required double pageHeight,
}) {
  if (itemHeights.isEmpty) {
    return const <List<int>>[<int>[]];
  }
  final pages = <List<int>>[];
  var current = <int>[];
  var used = 0.0;
  for (var i = 0; i < itemHeights.length; i++) {
    final height = itemHeights[i];
    if (current.isNotEmpty && used + height > pageHeight) {
      pages.add(current);
      current = <int>[];
      used = 0.0;
    }
    current.add(i);
    used += height;
  }
  if (current.isNotEmpty) pages.add(current);
  return pages;
}

/// Index of the page that shows [item] — used to re-anchor the reading
/// position after a re-pagination (font size or viewport change). Items
/// beyond the content fall back to the last page.
int pageContainingItem(List<List<int>> pages, int item) {
  if (item < 0) return 0;
  for (var p = 0; p < pages.length; p++) {
    if (pages[p].contains(item)) return p;
  }
  return pages.length - 1;
}
