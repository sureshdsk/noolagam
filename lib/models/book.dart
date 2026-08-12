class Book {
  final String id;
  final String title;
  final String author;
  final String summary;
  final String coverImage;
  final String category;
  final String language;
  final int totalChapters;

  const Book({
    required this.id,
    required this.title,
    required this.author,
    required this.summary,
    required this.coverImage,
    required this.category,
    required this.language,
    required this.totalChapters,
  });

  factory Book.fromJson(Map<String, dynamic> json) {
    return Book(
      id: json['id'].toString(),
      title: json['title'] ?? '',
      author: json['author'] ?? '',
      summary: json['summary'] ?? '',
      coverImage: json['cover_image'] ?? '',
      category: json['category'] ?? '',
      language: json['language'] ?? 'தமிழ்',
      totalChapters: json['total_chapters'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "title": title,
      "author": author,
      "summary": summary,
      "cover_image": coverImage,
      "category": category,
      "language": language,
      "total_chapters": totalChapters,
    };
  }

  Book copyWith({
    String? id,
    String? title,
    String? author,
    String? summary,
    String? coverImage,
    String? category,
    String? language,
    int? totalChapters,
  }) {
    return Book(
      id: id ?? this.id,
      title: title ?? this.title,
      author: author ?? this.author,
      summary: summary ?? this.summary,
      coverImage: coverImage ?? this.coverImage,
      category: category ?? this.category,
      language: language ?? this.language,
      totalChapters: totalChapters ?? this.totalChapters,
    );
  }
}
