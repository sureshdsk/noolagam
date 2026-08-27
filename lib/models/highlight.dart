/// A saved text highlight (bookmark) inside a book.
///
/// Anchors to content — chapter, block, and character range — instead of
/// a page, so it survives font-size changes and re-pagination: the
/// reader resolves the owning page on demand for the current layout.
class Highlight {
  final String id;
  final String bookId;
  final int chapterIdx;
  final int blockIdx;
  final int start;
  final int end;
  final String text;
  final String? chapterTitle;
  final DateTime createdAt;

  const Highlight({
    required this.id,
    required this.bookId,
    required this.chapterIdx,
    required this.blockIdx,
    required this.start,
    required this.end,
    required this.text,
    this.chapterTitle,
    required this.createdAt,
  });

  /// Same content spot (independent of excerpt text or timestamp).
  bool sameSpot(Highlight other) =>
      chapterIdx == other.chapterIdx &&
      blockIdx == other.blockIdx &&
      start == other.start &&
      end == other.end;

  String get chapterLabel =>
      chapterTitle == null || chapterTitle!.isEmpty
          ? 'அத்தியாயம் ${chapterIdx + 1}'
          : chapterTitle!;

  Map<String, dynamic> toJson() => {
        'id': id,
        'book_id': bookId,
        'chapter_idx': chapterIdx,
        'block_idx': blockIdx,
        'start': start,
        'end': end,
        'text': text,
        'chapter_title': chapterTitle,
        'created_at': createdAt.toIso8601String(),
      };

  factory Highlight.fromJson(Map<String, dynamic> json) {
    return Highlight(
      id: json['id']?.toString() ?? '',
      bookId: json['book_id'].toString(),
      chapterIdx: (json['chapter_idx'] as num?)?.toInt() ?? 0,
      blockIdx: (json['block_idx'] as num?)?.toInt() ?? 0,
      start: (json['start'] as num?)?.toInt() ?? 0,
      end: (json['end'] as num?)?.toInt() ?? 0,
      text: json['text']?.toString() ?? '',
      chapterTitle: json['chapter_title']?.toString(),
      createdAt:
          DateTime.tryParse(json['created_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}
