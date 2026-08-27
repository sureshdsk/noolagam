import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show RenderProxyBox;
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/reader_palette.dart';
import '../../../models/chapter.dart';
import '../../../models/highlight.dart';
import '../../../services/api/api_client.dart';
import '../../../services/api/book_service.dart';
import '../../../state/highlights_provider.dart';
import '../../../state/reader_prefs_provider.dart';
import '../../../state/reading_progress_provider.dart';
import '../reader/paginator.dart';
import '../widgets/blocks/block_view.dart';
import '../widgets/reader_toolbar.dart';

const double _pageHPad = 22;
const double _pageVPad = 26;

typedef _LayoutSpec = ({
  double fontSize,
  TextScaler textScaler,
  double width,
  double height,
});

/// Block-model chapter reader with real pagination: chapter content is
/// measured and packed into fixed-height pages that reflow whenever the
/// font size or viewport changes. Horizontal swipe / edge taps turn
/// pages, crossing chapter boundaries chains into the next chapter, and
/// every page turn updates the reading progress.
class ReaderScreen extends StatefulWidget {
  final String bookId;
  final String bookTitle;
  final String? bookAuthor;
  final int totalChapters;
  final int initialIdx;
  final int? initialPageIdx;
  final BookService? service;

  const ReaderScreen({
    super.key,
    required this.bookId,
    required this.bookTitle,
    this.bookAuthor,
    required this.totalChapters,
    this.initialIdx = 0,
    this.initialPageIdx,
    this.service,
  });

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  late final BookService _service = widget.service ?? BookService();
  final _titleCache = <int, String>{};

  // Chapter content cache (independent of layout).
  final _chapters = <int, ContentChapter>{};
  final _chapterLoads = <int, Future<ContentChapter>>{};
  final _chapterErrors = <int, Object>{};

  // Pagination for the active layout; stale copies keep the screen
  // stable while content is re-measured after a font/viewport change.
  _LayoutSpec? _layout;
  int _gen = 0;
  final _pages = <int, List<List<int>>>{};
  final _heights = <int, List<double>>{};
  final _stalePages = <int, List<List<int>>>{};
  final _staleHeightsMap = <int, List<double>>{};
  final _measureQueue = <int>[];

  late int _chapterIdx;
  int _pageIdx = 0;
  int _presentGen = 0;
  int? _pendingAnchorItem;
  int? _pendingJumpBlock;
  bool _needsPresent = true;
  int? _scrub;

  /// Current book's highlights — captured each build so page widgets and
  /// the measurement pass stay in sync.
  List<Highlight> _highlights = const [];

  PageController? _controller;

  List<List<int>>? get _displayPages =>
      _pages[_chapterIdx] ?? _stalePages[_chapterIdx];

  bool get _hasPrev => _chapterIdx > 0 || _pageIdx > 0;

  bool get _hasNext =>
      _chapterIdx + 1 < widget.totalChapters ||
      _pageIdx + 1 < (_displayPages?.length ?? 0);

  @override
  void initState() {
    super.initState();
    _chapterIdx = widget.totalChapters > 0
        ? widget.initialIdx.clamp(0, widget.totalChapters - 1)
        : 0;
    _pageIdx = widget.initialPageIdx == null || widget.initialPageIdx! < 0
        ? 0
        : widget.initialPageIdx!;
    // Fonts can finish loading after chapters were measured (google_fonts
    // on web, engine fallback fonts for Tamil glyphs), silently changing
    // every item's height — re-measure when that happens.
    PaintingBinding.instance.systemFonts.addListener(_onSystemFontsChanged);
  }

  @override
  void dispose() {
    PaintingBinding.instance.systemFonts.removeListener(_onSystemFontsChanged);
    _controller?.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------- load

  void _ensureChapter(int idx) {
    if (idx < 0 || idx >= widget.totalChapters) return;
    if (_chapters.containsKey(idx) ||
        _chapterLoads.containsKey(idx) ||
        _chapterErrors.containsKey(idx)) {
      return;
    }
    final future = _service.getChapter(widget.bookId, idx);
    _chapterLoads[idx] = future;
    future.then((chapter) {
      _chapterLoads.remove(idx);
      _chapterErrors.remove(idx);
      _chapters[idx] = chapter;
      if (chapter.title.isNotEmpty) _titleCache[idx] = chapter.title;
      if (!mounted) return;
      _enqueuePagination(idx);
      setState(() {});
    }).catchError((error) {
      _chapterLoads.remove(idx);
      _chapterErrors[idx] = error;
      if (mounted) setState(() {});
    });
  }

  void _retryChapter() {
    setState(() => _chapterErrors.remove(_chapterIdx));
    _ensureChapter(_chapterIdx);
  }

  // ----------------------------------------------------------- paginate

  void _enqueuePagination(int idx, {bool front = false}) {
    if (idx < 0 || idx >= widget.totalChapters) return;
    if (!_chapters.containsKey(idx) || _pages.containsKey(idx)) return;
    _measureQueue.remove(idx);
    if (front) {
      _measureQueue.insert(0, idx);
    } else {
      _measureQueue.add(idx);
    }
  }

  /// Detects font-size / text-scale / viewport changes and reflows: keeps
  /// the last pagination for display, remembers the current page's first
  /// item as re-anchor, and queues a fresh measurement.
  void _syncLayout(double fontSize, TextScaler textScaler, Size viewport) {
    final spec = (
      fontSize: fontSize,
      textScaler: textScaler,
      width: viewport.width,
      height: viewport.height,
    );
    if (spec == _layout) return;
    _layout = spec;
    _invalidatePagination();
  }

  /// Drops all measured pages and queues a re-measurement of the current
  /// chapter. The stale copies keep the screen stable until fresh
  /// pagination arrives, and [_pendingAnchorItem] restores the reading
  /// position on content-anchored pages.
  void _invalidatePagination() {
    if (_pages.isNotEmpty) {
      for (final e in _pages.entries) {
        _stalePages[e.key] = e.value;
        _staleHeightsMap[e.key] = _heights[e.key] ?? const <double>[];
      }
      final current = _pages[_chapterIdx];
      if (current != null &&
          _pageIdx >= 0 &&
          _pageIdx < current.length &&
          current[_pageIdx].isNotEmpty) {
        _pendingAnchorItem = current[_pageIdx].first;
      }
    }
    _gen++;
    _pages.clear();
    _heights.clear();
    _measureQueue.clear();
    _needsPresent = true;
    _enqueuePagination(_chapterIdx, front: true);
  }

  /// Fonts arriving late (web) change item heights after they were
  /// measured; without a re-measure the packed pages would overflow and
  /// start scrolling vertically.
  void _onSystemFontsChanged() {
    if (!mounted || _pages.isEmpty) return;
    setState(_invalidatePagination);
  }

  void _onMeasured(int idx, List<double> heights, int gen) {
    if (!mounted || gen != _gen || _layout == null) return;
    final pageHeight = _layout!.height - 2 * _pageVPad;
    final paginated = paginateItems(itemHeights: heights, pageHeight: pageHeight);
    _pages[idx] = paginated;
    _heights[idx] = heights;
    _stalePages.remove(idx);
    _staleHeightsMap.remove(idx);
    _measureQueue.remove(idx);

    // Preload neighbours so chapter chaining feels instant.
    _ensureChapter(idx + 1);
    _ensureChapter(idx - 1);

    if (idx == _chapterIdx) {
      var page = _pageIdx;
      var present = _needsPresent;
      final jumpBlock = _pendingJumpBlock;
      if (jumpBlock != null) {
        _pendingJumpBlock = null;
        page = pageContainingItem(paginated, _itemForBlock(idx, jumpBlock));
        present = true;
      } else {
        final anchor = _pendingAnchorItem;
        if (anchor != null) {
          _pendingAnchorItem = null;
          page = pageContainingItem(paginated, anchor);
          present = true;
        }
      }
      if (present) {
        _present(page);
        _record();
      }
    }
    setState(() {});
  }

  /// Attaches a fresh PageController to the current chapter at [page]
  /// (clamped). Used for the initial layout and after re-pagination.
  void _present([int page = -1]) {
    if (!mounted) return;
    setState(() {
      if (page >= 0) _pageIdx = page;
      final list = _pages[_chapterIdx];
      if (list != null && list.isNotEmpty) {
        _pageIdx = _pageIdx.clamp(0, list.length - 1);
      }
      _needsPresent = false;
      _presentGen++;
      final old = _controller;
      // keepPage: false — re-attaching controllers must honour
      // initialPage instead of restoring a stale PageStorage offset.
      _controller = PageController(initialPage: _pageIdx + 1, keepPage: false);
      if (old != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) => old.dispose());
      }
    });
  }

  // ------------------------------------------------------------ navigate

  void _gotoChapter(int idx, {int page = 0, bool lastPage = false}) {
    if (idx < 0 || idx >= widget.totalChapters) return;
    if (idx == _chapterIdx) {
      final list = _displayPages;
      if (list == null || _controller == null) return;
      final target = lastPage ? list.length - 1 : page;
      _controller!.animateToPage(
        target.clamp(0, list.length - 1) + 1,
        duration: const Duration(milliseconds: 380),
        curve: Curves.easeOutCubic,
      );
      return;
    }
    setState(() {
      _chapterIdx = idx;
      _pageIdx = page;
      _pendingAnchorItem = null;
      _needsPresent = true;
    });
    _ensureChapter(idx);
    _enqueuePagination(idx, front: true);
    if (_pages.containsKey(idx)) {
      _present(lastPage ? _pages[idx]!.length - 1 : page);
      _record();
    }
  }

  void _turnPage(int dir) {
    final list = _displayPages;
    if (list == null || _controller == null) return;
    final target = _pageIdx + dir;
    if (target >= 0 && target < list.length) {
      _controller!.animateToPage(
        target + 1,
        duration: const Duration(milliseconds: 380),
        curve: Curves.easeOutCubic,
      );
    } else if (dir < 0) {
      _gotoChapter(_chapterIdx - 1, lastPage: true);
    } else {
      _gotoChapter(_chapterIdx + 1);
    }
  }

  void _onPageChanged(int slot) {
    final list = _displayPages;
    if (list == null) return;
    if (slot == 0) {
      if (_chapterIdx == 0) {
        _bounceBack(list);
        return;
      }
      _gotoChapter(_chapterIdx - 1, lastPage: true);
    } else if (slot == list.length + 1) {
      if (_chapterIdx + 1 >= widget.totalChapters) {
        _bounceBack(list);
        return;
      }
      _gotoChapter(_chapterIdx + 1);
    } else {
      setState(() => _pageIdx = slot - 1);
      _record();
    }
  }

  /// Book-end feedback: bouncing off the first/last page when there is
  /// no chapter left to chain into.
  void _bounceBack(List<List<int>> list) {
    _controller?.animateToPage(
      _pageIdx.clamp(0, list.length - 1) + 1,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  void _record() {
    final list = _pages[_chapterIdx];
    if (list == null || list.isEmpty) return;
    context.read<ReadingProgressProvider>().record(
          bookId: widget.bookId,
          bookTitle: widget.bookTitle,
          bookAuthor: widget.bookAuthor,
          totalChapters: widget.totalChapters,
          chapterIdx: _chapterIdx,
          chapterTitle: _titleCache[_chapterIdx],
          pageIdx: _pageIdx.clamp(0, list.length - 1),
          pageCount: list.length,
        );
  }

  // ----------------------------------------------------------- highlights

  void _saveTextHighlight(int chapterIdx, int blockIdx, int start, int end) {
    final chapter = _chapters[chapterIdx];
    if (chapter == null || blockIdx >= chapter.blocks.length) return;
    final block = chapter.blocks[blockIdx];
    if (block is! ParagraphBlock) return;
    if (start < 0 || end <= start || end > block.text.length) return;
    _addHighlight(chapterIdx, blockIdx, start, end, block.text.substring(start, end));
  }

  void _toggleParagraphHighlight(int chapterIdx, int blockIdx) {
    final provider = context.read<HighlightsProvider>();
    if (provider
        .forBlock(widget.bookId, chapterIdx, blockIdx)
        .isNotEmpty) {
      provider.removeForBlock(widget.bookId, chapterIdx, blockIdx);
      return;
    }
    final chapter = _chapters[chapterIdx];
    if (chapter == null || blockIdx >= chapter.blocks.length) return;
    final block = chapter.blocks[blockIdx];
    if (block is! ParagraphBlock) return;
    _addHighlight(chapterIdx, blockIdx, 0, block.text.length, block.text);
  }

  void _addHighlight(
    int chapterIdx,
    int blockIdx,
    int start,
    int end,
    String text,
  ) {
    context.read<HighlightsProvider>().toggle(
          Highlight(
            id: '${DateTime.now().microsecondsSinceEpoch}',
            bookId: widget.bookId,
            chapterIdx: chapterIdx,
            blockIdx: blockIdx,
            start: start,
            end: end,
            text: text,
            chapterTitle: _titleCache[chapterIdx],
            createdAt: DateTime.now(),
          ),
        );
  }

  /// Jumps to the page that currently shows a highlight's block. Because
  /// highlights are content-anchored, this resolves correctly for any
  /// font size / viewport even after re-pagination.
  void _jumpToHighlight(Highlight h) {
    if (h.chapterIdx < 0 || h.chapterIdx >= widget.totalChapters) return;
    final pages = _pages[h.chapterIdx] ?? _stalePages[h.chapterIdx];
    if (pages != null && _chapters.containsKey(h.chapterIdx)) {
      _gotoChapter(
        h.chapterIdx,
        page: pageContainingItem(pages, _itemForBlock(h.chapterIdx, h.blockIdx)),
      );
      return;
    }
    _pendingJumpBlock = h.blockIdx;
    _gotoChapter(h.chapterIdx);
  }

  void _showHighlightsSheet() {
    final palette = context.read<ReaderPrefsProvider>().palette;
    showModalBottomSheet(
      context: context,
      backgroundColor: palette.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => _HighlightsSheet(
        bookId: widget.bookId,
        palette: palette,
        onJump: (h) {
          Navigator.of(sheetContext).pop();
          _jumpToHighlight(h);
        },
      ),
    );
  }

  // --------------------------------------------------------------- build

  @override
  Widget build(BuildContext context) {
    final prefs = context.watch<ReaderPrefsProvider>();
    final palette = prefs.palette;
    _highlights = context.watch<HighlightsProvider>().forBook(widget.bookId);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: prefs.themeMode.isDark
          ? SystemUiOverlayStyle.light
          : SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: AnimatedContainer(
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOut,
          color: palette.background,
          child: SafeArea(
            bottom: false,
            child: Column(
              children: [
                _buildHeader(prefs, palette),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      _syncLayout(
                        prefs.fontSize,
                        MediaQuery.textScalerOf(context),
                        constraints.biggest,
                      );
                      return Stack(
                        children: [
                          _buildPager(palette, prefs.fontSize),
                          Positioned(
                            top: 0,
                            bottom: 0,
                            left: 0,
                            width: 48,
                            child: _EdgeTapZone(
                              palette: palette,
                              icon: Icons.chevron_left_rounded,
                              tooltip: "முந்தைய பக்கம்",
                              enabled: _hasPrev,
                              onTap: () => _turnPage(-1),
                            ),
                          ),
                          Positioned(
                            top: 0,
                            bottom: 0,
                            right: 0,
                            width: 48,
                            child: _EdgeTapZone(
                              palette: palette,
                              icon: Icons.chevron_right_rounded,
                              tooltip: "அடுத்த பக்கம்",
                              enabled: _hasNext,
                              onTap: () => _turnPage(1),
                            ),
                          ),
                          _buildMeasurer(palette, prefs.fontSize),
                        ],
                      );
                    },
                  ),
                ),
                ReaderToolbar(
                  palette: palette,
                  themeMode: prefs.themeMode,
                  fontSize: prefs.fontSize,
                  position: _chapterIdx + 1,
                  totalChapters: widget.totalChapters,
                  previewPosition: _scrub == null ? null : _scrub! + 1,
                  onDecreaseFont: () => prefs.changeFontSize(-2),
                  onIncreaseFont: () => prefs.changeFontSize(2),
                  onCycleTheme: prefs.cycleTheme,
                  onScrubPreview: (v) => setState(() => _scrub = v.round()),
                  onScrubCommit: (v) {
                    final idx = v.round() - 1;
                    setState(() => _scrub = null);
                    _gotoChapter(idx);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(ReaderPrefsProvider prefs, ReaderPalette palette) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOut,
      color: palette.surface,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_rounded),
            color: palette.text,
            tooltip: "மீண்டும்",
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.bookTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: palette.text,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _headerSubtitle,
                  style: TextStyle(
                    color: palette.secondary,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
          _BookmarkButton(
            palette: palette,
            count: _highlights.length,
            onPressed: _showHighlightsSheet,
          ),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) => Opacity(
              opacity: value,
              child: child,
            ),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: Container(
                key: ValueKey(prefs.themeMode),
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: palette.accent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  prefs.themeMode.label,
                  style: TextStyle(
                    color: palette.secondary,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String get _headerSubtitle {
    final base =
        'அத்தியாயம் ${(_scrub ?? _chapterIdx) + 1} / ${widget.totalChapters}';
    if (_scrub != null) return base;
    final list = _displayPages;
    if (list == null || list.isEmpty) return base;
    final page = _pageIdx.clamp(0, list.length - 1) + 1;
    return '$base · பக்கம் $page / ${list.length}';
  }

  Widget _buildPager(ReaderPalette palette, double fontSize) {
    if (widget.totalChapters == 0) {
      return Center(
        child: Text(
          "அத்தியாயங்கள் இல்லை",
          style: TextStyle(color: palette.secondary),
        ),
      );
    }
    _ensureChapter(_chapterIdx);
    _enqueuePagination(_chapterIdx, front: true);

    final error = _chapterErrors[_chapterIdx];
    if (error != null) {
      return _ReaderError(
        palette: palette,
        error: error,
        onRetry: _retryChapter,
      );
    }
    final display = _displayPages;
    if (!_chapters.containsKey(_chapterIdx) ||
        display == null ||
        _controller == null) {
      return Center(
        child: CircularProgressIndicator(color: palette.accent),
      );
    }
    final chapter = _chapters[_chapterIdx]!;
    final heights = _heights[_chapterIdx] ??
        _staleHeightsMap[_chapterIdx] ??
        const <double>[];
    final pageHeight = (_layout?.height ?? 0) - 2 * _pageVPad;

    // Keyed per presentation: a fresh element attaches the controller
    // with no prior scroll position, so initialPage is honoured when
    // jumping to a different chapter/page.
    return PageView.builder(
      key: ValueKey((_presentGen, _chapterIdx)),
      controller: _controller!,
      itemCount: display.length + 2,
      allowImplicitScrolling: true,
      onPageChanged: _onPageChanged,
      itemBuilder: (context, slot) {
        if (slot == 0) return _sentinelPage(palette, -1);
        if (slot == display.length + 1) return _sentinelPage(palette, 1);
        final items = display[slot - 1];
        final oversized = items.length == 1 &&
            items.first < heights.length &&
            heights[items.first] > pageHeight;
        return _ChapterPageView(
          oversized: oversized,
          children: [
            for (final item in items)
              _chapterItem(chapter, palette, fontSize, item),
          ],
        );
      },
    );
  }

  /// Transitional blank page past the first/last page of a chapter:
  /// swiping onto it chains into the neighbouring chapter. Shows a
  /// subtle loader only when the target still needs to load.
  Widget _sentinelPage(ReaderPalette palette, int dir) {
    final target = _chapterIdx + dir;
    if (target < 0 || target >= widget.totalChapters) {
      return const SizedBox.shrink();
    }
    if (_pages.containsKey(target)) return const SizedBox.shrink();
    return Center(
      child: SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2.2,
          color: palette.accent.withValues(alpha: 0.7),
        ),
      ),
    );
  }

  /// Offstage single-slot measurer: lays out one queued chapter's items
  /// at the current page width and reports their heights after layout.
  Widget _buildMeasurer(ReaderPalette palette, double fontSize) {
    final layout = _layout;
    if (layout == null) return const SizedBox.shrink();
    _measureQueue.removeWhere(
      (idx) => _pages.containsKey(idx) || !_chapters.containsKey(idx),
    );
    if (_measureQueue.isEmpty) return const SizedBox.shrink();
    final idx = _measureQueue.first;
    final gen = _gen;
    return Offstage(
      child: SizedBox(
        width: layout.width - 2 * _pageHPad,
        child: _BlockColumnMeasurer(
          key: ValueKey((idx, layout, gen)),
          items: _chapterItems(_chapters[idx]!, palette, fontSize),
          onMeasured: (heights) => _onMeasured(idx, heights, gen),
        ),
      ),
    );
  }

  // ------------------------------------------------------ chapter items

  /// Item list for a chapter: the title (when present) followed by its
  /// blocks. Shared by the measurer and the page renderer so pagination
  /// and display always agree on widget configuration.
  List<Widget> _chapterItems(
    ContentChapter chapter,
    ReaderPalette palette,
    double fontSize,
  ) {
    return [
      for (var i = 0; i < _itemCount(chapter); i++)
        _chapterItem(chapter, palette, fontSize, i),
    ];
  }

  int _itemCount(ContentChapter chapter) =>
      (chapter.title.isNotEmpty ? 1 : 0) + chapter.blocks.length;

  /// Item index of a block — the title occupies item 0 when present.
  int _itemForBlock(int chapterIdx, int blockIdx) {
    final chapter = _chapters[chapterIdx];
    final offset = (chapter != null && chapter.title.isNotEmpty) ? 1 : 0;
    return offset + blockIdx;
  }

  Widget _chapterItem(
    ContentChapter chapter,
    ReaderPalette palette,
    double fontSize,
    int item,
  ) {
    if (chapter.title.isNotEmpty && item == 0) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 18),
        child: Semantics(
          header: true,
          child: Text(
            chapter.title,
            style: TextStyle(
              color: palette.text,
              fontSize: fontSize + 8,
              fontWeight: FontWeight.bold,
              height: 1.4,
            ),
          ),
        ),
      );
    }
    final blockIdx = chapter.title.isNotEmpty ? item - 1 : item;
    final interactive = chapter.blocks[blockIdx] is ParagraphBlock;
    return BlockView(
      block: chapter.blocks[blockIdx],
      palette: palette,
      fontSize: fontSize,
      highlights: interactive
          ? _highlightsFor(chapter.chapterIdx, blockIdx)
          : null,
      onSaveTextHighlight: interactive
          ? (start, end) =>
              _saveTextHighlight(chapter.chapterIdx, blockIdx, start, end)
          : null,
      onToggleParagraphHighlight: interactive
          ? () => _toggleParagraphHighlight(chapter.chapterIdx, blockIdx)
          : null,
    );
  }

  List<Highlight> _highlightsFor(int chapterIdx, int blockIdx) => _highlights
      .where((h) => h.chapterIdx == chapterIdx && h.blockIdx == blockIdx)
      .toList();
}

/// One fixed-size page. Normal pages are clipped columns — no Scrollable
/// at all, so they can never scroll or show a scrollbar however rounding
/// drifts; an oversized single-item page scrolls internally instead.
class _ChapterPageView extends StatelessWidget {
  final List<Widget> children;
  final bool oversized;

  const _ChapterPageView({
    required this.children,
    required this.oversized,
  });

  @override
  Widget build(BuildContext context) {
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: _pageHPad,
        vertical: _pageVPad,
      ),
      child: oversized
          ? SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              child: content,
            )
          : ClipRect(
              child: OverflowBox(
                alignment: Alignment.topCenter,
                maxHeight: double.infinity,
                child: content,
              ),
            ),
    );
  }
}

/// Lays out [items] once and reports their natural heights. Measurement
/// happens through real render objects, so every block type (tables,
/// quotes, lists…) is measured exactly as it will be displayed.
class _BlockColumnMeasurer extends StatefulWidget {
  final List<Widget> items;
  final void Function(List<double> heights) onMeasured;

  const _BlockColumnMeasurer({
    super.key,
    required this.items,
    required this.onMeasured,
  });

  @override
  State<_BlockColumnMeasurer> createState() => _BlockColumnMeasurerState();
}

class _BlockColumnMeasurerState extends State<_BlockColumnMeasurer> {
  final _heights = <int, double>{};

  @override
  void initState() {
    super.initState();
    _reportWhenReady();
  }

  void _reportWhenReady() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_heights.length >= widget.items.length) {
        widget.onMeasured([
          for (var i = 0; i < widget.items.length; i++) _heights[i] ?? 0,
        ]);
      } else {
        _reportWhenReady();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < widget.items.length; i++)
          _MeasureSize(
            index: i,
            onLayout: (index, height) => _heights[index] = height,
            child: widget.items[i],
          ),
      ],
    );
  }
}

/// Render proxy that reports its child's height during layout.
class _MeasureSize extends SingleChildRenderObjectWidget {
  final int index;
  final void Function(int index, double height) onLayout;

  const _MeasureSize({
    required this.index,
    required this.onLayout,
    required super.child,
  });

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderMeasureSize(index, onLayout);

  @override
  void updateRenderObject(
    BuildContext context,
    covariant _RenderMeasureSize renderObject,
  ) {
    renderObject
      ..index = index
      ..onLayout = onLayout;
  }
}

class _RenderMeasureSize extends RenderProxyBox {
  _RenderMeasureSize(this._index, this._onLayout);

  int _index;
  void Function(int index, double height) _onLayout;

  set index(int value) => _index = value;
  set onLayout(void Function(int index, double height) value) =>
      _onLayout = value;

  @override
  void performLayout() {
    super.performLayout();
    if (size.height > 0) _onLayout(_index, size.height);
  }
}

/// Header shortcut to the saved highlights, with a count badge.
class _BookmarkButton extends StatelessWidget {
  final ReaderPalette palette;
  final int count;
  final VoidCallback onPressed;

  const _BookmarkButton({
    required this.palette,
    required this.count,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'ஹைலைட்கள்',
      value: count > 0 ? '$count' : null,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          IconButton(
            onPressed: onPressed,
            icon: const Icon(Icons.bookmark_border_rounded),
            color: palette.text,
            tooltip: "ஹைலைட்கள்",
            visualDensity: VisualDensity.compact,
          ),
          if (count > 0)
            Positioned(
              top: 4,
              right: 2,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 4,
                  vertical: 1,
                ),
                decoration: BoxDecoration(
                  color: palette.accent,
                  borderRadius: BorderRadius.circular(9),
                ),
                constraints: const BoxConstraints(minWidth: 14),
                child: Text(
                  '$count',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: palette.surface,
                    fontSize: 8.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Bottom sheet listing every highlight for the book: tap to jump to
/// the highlight, trash to delete.
class _HighlightsSheet extends StatelessWidget {
  final String bookId;
  final ReaderPalette palette;
  final void Function(Highlight highlight) onJump;

  const _HighlightsSheet({
    required this.bookId,
    required this.palette,
    required this.onJump,
  });

  @override
  Widget build(BuildContext context) {
    final highlights = context.watch<HighlightsProvider>().forBook(bookId)
      ..sort((a, b) {
        final byChapter = a.chapterIdx.compareTo(b.chapterIdx);
        return byChapter != 0 ? byChapter : a.start.compareTo(b.start);
      });

    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.68,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 18, 22, 6),
              child: Row(
                children: [
                  Icon(
                    Icons.bookmark_rounded,
                    size: 18,
                    color: palette.accent,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    "ஹைலைட்கள்",
                    style: TextStyle(
                      color: palette.text,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  if (highlights.isNotEmpty)
                    Text(
                      '${highlights.length}',
                      style: TextStyle(
                        color: palette.secondary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),
            Divider(color: palette.secondary.withValues(alpha: 0.2), height: 1),
            if (highlights.isEmpty)
              Padding(
                padding: const EdgeInsets.all(30),
                child: Center(
                  child: Text(
                    "இன்னும் ஹைலைட் இல்லை. உரையை தேர்ந்தெடுத்து 'ஹைலைட்' அழுத்துங்கள்.",
                    textAlign: TextAlign.center,
                    style: TextStyle(color: palette.secondary, fontSize: 13.5),
                  ),
                ),
              )
            else
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  padding: const EdgeInsets.symmetric(vertical: 8)
                      .add(const EdgeInsets.only(bottom: 8)),
                  itemCount: highlights.length,
                  itemBuilder: (context, i) {
                    final h = highlights[i];
                    return _HighlightRow(
                      highlight: h,
                      palette: palette,
                      onTap: () => onJump(h),
                      onDelete: () =>
                          context.read<HighlightsProvider>().remove(h.id),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _HighlightRow extends StatelessWidget {
  final Highlight highlight;
  final ReaderPalette palette;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _HighlightRow({
    required this.highlight,
    required this.palette,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 4,
              height: 44,
              decoration: BoxDecoration(
                color: palette.accent,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    highlight.text,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: palette.text,
                      fontSize: 13.5,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    highlight.chapterLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: palette.secondary,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline_rounded),
              iconSize: 19,
              color: palette.secondary,
              tooltip: "நீக்கு",
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
      ),
    );
  }
}

/// Invisible left/right tap strip that turns pages like a book.
class _EdgeTapZone extends StatelessWidget {
  final ReaderPalette palette;
  final IconData icon;
  final String tooltip;
  final bool enabled;
  final VoidCallback onTap;

  const _EdgeTapZone({
    required this.palette,
    required this.icon,
    required this.tooltip,
    required this.enabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: enabled,
      label: tooltip,
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: enabled ? onTap : null,
        child: SizedBox.expand(
          child: Center(
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 250),
              opacity: enabled ? 0.3 : 0,
              child: Icon(icon, size: 22, color: palette.secondary),
            ),
          ),
        ),
      ),
    );
  }
}

class _ReaderError extends StatelessWidget {
  final ReaderPalette palette;
  final Object error;
  final VoidCallback onRetry;

  const _ReaderError({
    required this.palette,
    required this.error,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final message = error is ApiException
        ? (error as ApiException).toString()
        : error.toString();
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(30),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_off_rounded, color: palette.secondary, size: 44),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: palette.secondary),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text("மீண்டும் முயற்சி"),
              style: OutlinedButton.styleFrom(
                foregroundColor: palette.accent,
                side: BorderSide(color: palette.accent),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
