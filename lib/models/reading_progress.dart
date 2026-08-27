/// Local reading progress for a book, powering "continue reading" and the
/// library tab. Persisted as JSON in shared_preferences (no backend yet).
///
/// [lastPageIdx]/[lastPageCount] are page-granular (added with the
/// paginated reader); older entries without them keep chapter granularity.
class ReadingProgress {
  final String bookId;
  final String bookTitle;
  final String? bookAuthor;
  final int totalChapters;
  final int lastChapterIdx;
  final String? lastChapterTitle;
  final int? lastPageIdx;
  final int? lastPageCount;
  final DateTime updatedAt;

  const ReadingProgress({
    required this.bookId,
    required this.bookTitle,
    this.bookAuthor,
    required this.totalChapters,
    required this.lastChapterIdx,
    this.lastChapterTitle,
    this.lastPageIdx,
    this.lastPageCount,
    required this.updatedAt,
  });

  /// Overall completion: chapter progress plus how far into the current
  /// chapter's last-read page the reader got. Legacy entries (no page
  /// info) count the whole chapter as read, matching the old value.
  double get fraction {
    if (totalChapters <= 0) return 0;
    final withinChapter =
        (lastPageIdx == null || lastPageCount == null || lastPageCount! <= 0)
            ? 1.0
            : (lastPageIdx! + 1) / lastPageCount!;
    return ((lastChapterIdx + withinChapter) / totalChapters)
        .clamp(0.0, 1.0);
  }

  Map<String, dynamic> toJson() => {
        'book_id': bookId,
        'book_title': bookTitle,
        'book_author': bookAuthor,
        'total_chapters': totalChapters,
        'last_chapter_idx': lastChapterIdx,
        'last_chapter_title': lastChapterTitle,
        'last_page_idx': lastPageIdx,
        'last_page_count': lastPageCount,
        'updated_at': updatedAt.toIso8601String(),
      };

  factory ReadingProgress.fromJson(Map<String, dynamic> json) {
    return ReadingProgress(
      bookId: json['book_id'].toString(),
      bookTitle: json['book_title']?.toString() ?? '',
      bookAuthor: json['book_author']?.toString(),
      totalChapters: (json['total_chapters'] as num?)?.toInt() ?? 0,
      lastChapterIdx: (json['last_chapter_idx'] as num?)?.toInt() ?? 0,
      lastChapterTitle: json['last_chapter_title']?.toString(),
      lastPageIdx: (json['last_page_idx'] as num?)?.toInt(),
      lastPageCount: (json['last_page_count'] as num?)?.toInt(),
      updatedAt:
          DateTime.tryParse(json['updated_at']?.toString() ?? '') ??
              DateTime.now(),
    );
  }
}
