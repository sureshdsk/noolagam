import '../core/config.dart';
import 'chapter.dart';

/// A published book as returned by `GET /v1/books` (snake_case).
///
/// `chapters` is only populated by `GET /v1/books/:id` (detail).
class Book {
  final String id;
  final String title;
  final String? author;
  final String? summary;
  final String language;
  final int totalChapters;
  final bool hasAudio;
  final int? a11yScore;
  final int contentVersion;
  final DateTime? publishedAt;
  final List<ChapterToc>? chapters;

  const Book({
    required this.id,
    required this.title,
    this.author,
    this.summary,
    required this.language,
    required this.totalChapters,
    this.hasAudio = false,
    this.a11yScore,
    this.contentVersion = 1,
    this.publishedAt,
    this.chapters,
  });

  factory Book.fromJson(Map<String, dynamic> json) {
    return Book(
      id: json['id'].toString(),
      title: json['title']?.toString() ?? '',
      author: json['author']?.toString(),
      summary: json['summary']?.toString(),
      language: json['language']?.toString() ?? 'ta',
      totalChapters: (json['total_chapters'] as num?)?.toInt() ?? 0,
      hasAudio: json['has_audio'] == true || json['has_audio'] == 1,
      a11yScore: (json['a11y_score'] as num?)?.toInt(),
      contentVersion: (json['content_version'] as num?)?.toInt() ?? 1,
      publishedAt: json['published_at'] == null
          ? null
          : DateTime.tryParse(json['published_at'].toString()),
      chapters: (json['chapters'] as List<dynamic>?)
          ?.map((e) => ChapterToc.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  String get coverUrl => ApiConfig.coverUrl(id);
}

/// Page envelope for `GET /v1/books`.
class BookPage {
  final List<Book> items;
  final int page;
  final int limit;
  final int total;

  const BookPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
  });

  factory BookPage.fromJson(Map<String, dynamic> json) {
    return BookPage(
      items: (json['items'] as List<dynamic>)
          .map((e) => Book.fromJson(e as Map<String, dynamic>))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
    );
  }

  bool get hasMore => page * limit < total;
}
