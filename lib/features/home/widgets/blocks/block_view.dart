import 'package:flutter/gestures.dart'
    show PointerDeviceKind, TapDragEndDetails, TapDragStartDetails;
import 'package:flutter/material.dart';

import '../../../../core/theme/reader_palette.dart';
import '../../../../models/chapter.dart';
import '../../../../models/highlight.dart';

/// Background tint for highlighted text. Warm amber that stays legible
/// across the light / sepia / dark reader palettes.
const Color kHighlightColor = Color(0x59FFC300);

/// Renders a single typed semantic block.
///
/// This is the accessibility core contract: every block type has a dedicated,
/// semantics-aware renderer — no raw HTML ever reaches the tree.
///
/// Paragraphs additionally support text selection with highlight actions:
/// the selection toolbar gains "highlight selection" and "highlight
/// paragraph" entries; saved [highlights] tint their ranges.
class BlockView extends StatelessWidget {
  final Block block;
  final ReaderPalette palette;
  final double fontSize;
  final List<Highlight>? highlights;
  final void Function(int start, int end)? onSaveTextHighlight;
  final VoidCallback? onToggleParagraphHighlight;

  const BlockView({
    super.key,
    required this.block,
    required this.palette,
    required this.fontSize,
    this.highlights,
    this.onSaveTextHighlight,
    this.onToggleParagraphHighlight,
  });

  bool get _hasHighlights => highlights != null && highlights!.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final widget = switch (block) {
      HeadingBlock b => _heading(b),
      ParagraphBlock b => _paragraph(b),
      ImageBlock b => _image(b),
      TableBlock b => _table(b),
      QuoteBlock b => _quote(b),
      ListBlock b => _list(b),
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: widget,
    );
  }

  Widget _heading(HeadingBlock b) {
    final scaled = switch (b.lvl) {
      1 => fontSize + 6,
      2 => fontSize + 4,
      3 => fontSize + 2,
      _ => fontSize,
    };
    return Semantics(
      header: true,
      child: Text(
        b.text,
        style: TextStyle(
          color: palette.text,
          fontSize: scaled,
          fontWeight: FontWeight.bold,
          height: 1.4,
        ),
      ),
    );
  }

  Widget _paragraph(ParagraphBlock b) {
    final style = TextStyle(
      color: palette.text,
      fontSize: fontSize,
      height: 1.8,
    );
    final ranges = mergedRanges(
      _hasHighlights ? highlights! : const <Highlight>[],
      b.text.length,
    );
    final interactive =
        onSaveTextHighlight != null || onToggleParagraphHighlight != null;
    if (ranges.isEmpty && !interactive) {
      return SelectableText(b.text, style: style);
    }
    return _HighlightText(
      text: b.text,
      style: style,
      // A raw EditableText has no SelectionArea ancestor, so without
      // this the in-progress selection would paint with no background.
      selectionColor: palette.accent.withValues(alpha: 0.3),
      ranges: ranges,
      interactive: interactive,
      hasHighlights: _hasHighlights,
      onSaveTextHighlight: onSaveTextHighlight,
      onToggleParagraphHighlight: onToggleParagraphHighlight,
    );
  }

  /// Image objects have no presign route yet, so we render alt text in a
  /// labelled placeholder instead of a broken image.
  Widget _image(ImageBlock b) {
    return Semantics(
      image: true,
      label: b.alt ?? 'படம்',
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: palette.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: palette.secondary.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            Icon(Icons.image_outlined, color: palette.secondary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                b.alt ?? 'படம்',
                style: TextStyle(
                  color: palette.secondary,
                  fontStyle: FontStyle.italic,
                  fontSize: fontSize - 2,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _table(TableBlock b) {
    if (b.rows.isEmpty) return const SizedBox.shrink();
    final rows = List<TableRow>.from(
      b.rows.map(
        (cells) => TableRow(
          children: cells
              .map(
                (cell) => Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  child: Text(
                    cell,
                    style: TextStyle(
                      color: palette.text,
                      fontSize: fontSize - 2,
                    ),
                  ),
                ),
              )
              .toList(),
        ),
      ),
    );

    // Highlight the first row when the source marked it as a header.
    final first = rows.first;
    if (b.header) {
      rows[0] = TableRow(
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: palette.accent, width: 1.5)),
        ),
        children: first.children
            .map(
              (child) => DefaultTextStyle(
                style: TextStyle(
                  color: palette.text,
                  fontWeight: FontWeight.bold,
                  fontSize: fontSize - 2,
                ),
                child: child,
              ),
            )
            .toList(),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: palette.secondary.withValues(alpha: 0.4)),
          borderRadius: BorderRadius.circular(12),
        ),
        padding: const EdgeInsets.all(6),
        child: Table(
          defaultColumnWidth: const IntrinsicColumnWidth(),
          border: TableBorder.symmetric(
            inside: BorderSide(color: palette.secondary.withValues(alpha: 0.2)),
          ),
          children: rows,
        ),
      ),
    );
  }

  Widget _quote(QuoteBlock b) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.quoteBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: palette.accent, width: 4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            b.text,
            style: TextStyle(
              color: palette.text,
              fontSize: fontSize,
              fontStyle: FontStyle.italic,
              height: 1.7,
            ),
          ),
          if (b.cite != null && b.cite!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              "— ${b.cite}",
              style: TextStyle(
                color: palette.secondary,
                fontSize: fontSize - 3,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _list(ListBlock b) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < b.items.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 28,
                  child: Text(
                    b.ordered ? '${i + 1}.' : '•',
                    style: TextStyle(
                      color: palette.accent,
                      fontSize: fontSize,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    b.items[i],
                    style: TextStyle(
                      color: palette.text,
                      fontSize: fontSize,
                      height: 1.7,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Selectable paragraph with saved-highlight tinting and highlight
/// actions in the selection toolbar.
///
/// Built on a raw [EditableText] instead of [SelectableText] so the
/// toolbar can be surfaced programmatically: SelectableText only shows
/// it after a touch long-press or a right-click, which makes highlight
/// actions undiscoverable when selecting with a mouse on web/desktop.
/// Here a mouse drag that starts a selection opens the toolbar
/// immediately (see [_onSelectionChanged]).
class _HighlightText extends StatefulWidget {
  final String text;
  final TextStyle style;
  final Color selectionColor;
  final List<({int start, int end})> ranges;
  final bool interactive;
  final bool hasHighlights;
  final void Function(int start, int end)? onSaveTextHighlight;
  final VoidCallback? onToggleParagraphHighlight;

  const _HighlightText({
    required this.text,
    required this.style,
    required this.selectionColor,
    required this.ranges,
    required this.interactive,
    required this.hasHighlights,
    this.onSaveTextHighlight,
    this.onToggleParagraphHighlight,
  });

  @override
  State<_HighlightText> createState() => _HighlightTextState();
}

class _HighlightTextState extends State<_HighlightText>
    implements TextSelectionGestureDetectorBuilderDelegate {
  final _controller = _TintedTextEditingController();
  final _focus = FocusNode(skipTraversal: true);
  final _editableKey = GlobalKey<EditableTextState>();
  late final _HighlightSelectionGestureDetector _gestureBuilder;

  @override
  GlobalKey<EditableTextState> get editableTextKey => _editableKey;

  @override
  bool get forcePressEnabled => false;

  @override
  bool get selectionEnabled => widget.interactive;

  @override
  void initState() {
    super.initState();
    _controller.text = widget.text;
    _controller.ranges = widget.ranges;
    _gestureBuilder = _HighlightSelectionGestureDetector(state: this);
  }

  @override
  void didUpdateWidget(covariant _HighlightText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      _controller.text = widget.text;
    }
    _controller.ranges = widget.ranges;
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _showToolbar() {
    _editableKey.currentState?.showToolbar();
  }

  Widget _contextMenu(BuildContext context, EditableTextState state) {
    return AdaptiveTextSelectionToolbar.buttonItems(
      anchors: state.contextMenuAnchors,
      buttonItems: [
        ContextMenuButtonItem(
          label: "ஹைலைட்",
          onPressed: () {
            state.hideToolbar();
            final sel = _controller.selection;
            if (!sel.isCollapsed &&
                sel.start >= 0 &&
                sel.end <= _controller.text.length) {
              widget.onSaveTextHighlight?.call(sel.start, sel.end);
            }
            _deselect();
          },
        ),
        if (widget.onToggleParagraphHighlight != null)
          ContextMenuButtonItem(
            label: widget.hasHighlights ? "ஹைலைட் நீக்கு" : "பத்தி ஹைலைட்",
            onPressed: () {
              state.hideToolbar();
              widget.onToggleParagraphHighlight!();
              _deselect();
            },
          ),
        ...state.contextMenuButtonItems,
      ],
    );
  }

  void _deselect() {
    _controller.selection = const TextSelection.collapsed(offset: -1);
  }

  @override
  Widget build(BuildContext context) {
    final editable = EditableText(
      key: _editableKey,
      controller: _controller,
      focusNode: _focus,
      readOnly: true,
      showCursor: false,
      showSelectionHandles: true,
      maxLines: null,
      style: widget.style,
      selectionColor: widget.selectionColor,
      cursorColor: Colors.transparent,
      backgroundCursorColor: Colors.transparent,
      // Handle-flavored controls: plain *SelectionControls instances make
      // EditableText ignore contextMenuBuilder entirely.
      selectionControls: materialTextSelectionHandleControls,
      // Route all gestures through our TextSelectionGestureDetector.
      // Otherwise RenderEditable's own tap/long-press recognizers win the
      // arena and select words without ever showing the toolbar.
      rendererIgnoresPointer: true,
      contextMenuBuilder: _contextMenu,
    );
    if (!widget.interactive) {
      return IgnorePointer(child: editable);
    }
    return _gestureBuilder.buildGestureDetector(
      behavior: HitTestBehavior.opaque,
      child: editable,
    );
  }
}

/// Gesture wiring for [_HighlightText], mirroring what SelectableText
/// does internally, plus the web/desktop fix: the stock builder never
/// shows the selection toolbar for mouse drags, so surface it as soon
/// as a mouse drag starts a selection — otherwise the highlight actions
/// are undiscoverable on web/desktop.
class _HighlightSelectionGestureDetector
    extends TextSelectionGestureDetectorBuilder {
  _HighlightSelectionGestureDetector({required this.state})
      : super(delegate: state);

  final _HighlightTextState state;

  PointerDeviceKind? _lastDragKind;

  @override
  void onDragSelectionStart(TapDragStartDetails details) {
    _lastDragKind = details.kind;
    super.onDragSelectionStart(details);
  }

  @override
  void onDragSelectionEnd(TapDragEndDetails details) {
    super.onDragSelectionEnd(details);
    final kind = _lastDragKind;
    _lastDragKind = null;
    if (kind == null ||
        kind == PointerDeviceKind.mouse ||
        kind == PointerDeviceKind.trackpad) {
      // The stock builder only shows the toolbar for touch/stylus; a
      // mouse drag-select would leave the highlight actions unreachable
      // on web/desktop, so surface the toolbar when the drag completes.
      if (!state._controller.selection.isCollapsed) {
        state._showToolbar();
      }
    }
  }

}

/// Controller that renders its text with [kHighlightColor] backgrounds
/// over the merged highlight [ranges] — the tint is part of the text
/// model, so selection handles and the caret track it correctly.
///
/// Changing [ranges] notifies listeners, forcing [EditableText] to
/// rebuild and repaint its span — a plain field mutation would leave
/// the repaint to widget-rebuild scheduling, which can drop the update.
class _TintedTextEditingController extends TextEditingController {
  List<({int start, int end})> _ranges = const [];

  List<({int start, int end})> get ranges => _ranges;

  set ranges(List<({int start, int end})> value) {
    if (_sameRanges(value)) return;
    _ranges = value;
    notifyListeners();
  }

  bool _sameRanges(List<({int start, int end})> value) {
    if (_ranges.length != value.length) return false;
    for (var i = 0; i < value.length; i++) {
      // Records compare structurally.
      if (_ranges[i] != value[i]) return false;
    }
    return true;
  }

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    bool withComposing = false,
  }) {
    if (ranges.isEmpty) return TextSpan(text: text, style: style);
    final spans = <InlineSpan>[];
    var pos = 0;
    for (final r in ranges) {
      if (r.start > pos) {
        spans.add(TextSpan(text: text.substring(pos, r.start)));
      }
      spans.add(TextSpan(
        text: text.substring(r.start, r.end),
        style: const TextStyle(backgroundColor: kHighlightColor),
      ));
      pos = r.end;
    }
    if (pos < text.length) spans.add(TextSpan(text: text.substring(pos)));
    return TextSpan(style: style, children: spans);
  }
}

/// Merges overlapping / adjacent highlight ranges into a sorted,
/// clamped list of non-overlapping spans ready for rendering.
List<({int start, int end})> mergedRanges(
  List<Highlight> highlights,
  int length,
) {
  final clamped = highlights
      .map((h) {
        final start = h.start.clamp(0, length).toInt();
        return (
          start: start,
          end: h.end.clamp(start, length).toInt(),
        );
      })
      .where((r) => r.end > r.start)
      .toList()
    ..sort((a, b) => a.start.compareTo(b.start) == 0
        ? a.end.compareTo(b.end)
        : a.start.compareTo(b.start));

  final merged = <({int start, int end})>[];
  for (final r in clamped) {
    if (merged.isNotEmpty && r.start <= merged.last.end) {
      if (r.end > merged.last.end) {
        merged[merged.length - 1] = (start: merged.last.start, end: r.end);
      }
    } else {
      merged.add(r);
    }
  }
  return merged;
}
