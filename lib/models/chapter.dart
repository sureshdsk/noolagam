class Chapter {
  final String id;
  final String bookId;
  final int chapterNumber;
  final String title;
  final String content;
  final int readingTime;
  final bool isBookmarked;
  final bool isCompleted;
  final bool audioAvailable;
  final String audioUrl;

  const Chapter({
    required this.id,
    required this.bookId,
    required this.chapterNumber,
    required this.title,
    required this.content,
    required this.readingTime,
    required this.isBookmarked,
    required this.isCompleted,
    required this.audioAvailable,
    required this.audioUrl,
  });

  factory Chapter.fromJson(Map<String, dynamic> json) {
    return Chapter(
      id: json["id"].toString(),
      bookId: json["book_id"].toString(),
      chapterNumber: json["chapter_number"] ?? 1,
      title: json["title"] ?? "",
      content: json["content"] ?? "",
      readingTime: json["reading_time"] ?? 0,
      isBookmarked: json["is_bookmarked"] ?? false,
      isCompleted: json["is_completed"] ?? false,
      audioAvailable: json["audio_available"] ?? false,
      audioUrl: json["audio_url"] ?? "",
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "book_id": bookId,
      "chapter_number": chapterNumber,
      "title": title,
      "content": content,
      "reading_time": readingTime,
      "is_bookmarked": isBookmarked,
      "is_completed": isCompleted,
      "audio_available": audioAvailable,
      "audio_url": audioUrl,
    };
  }

  Chapter copyWith({
    String? id,
    String? bookId,
    int? chapterNumber,
    String? title,
    String? content,
    int? readingTime,
    bool? isBookmarked,
    bool? isCompleted,
    bool? audioAvailable,
    String? audioUrl,
  }) {
    return Chapter(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      chapterNumber: chapterNumber ?? this.chapterNumber,
      title: title ?? this.title,
      content: content ?? this.content,
      readingTime: readingTime ?? this.readingTime,
      isBookmarked: isBookmarked ?? this.isBookmarked,
      isCompleted: isCompleted ?? this.isCompleted,
      audioAvailable: audioAvailable ?? this.audioAvailable,
      audioUrl: audioUrl ?? this.audioUrl,
    );
  }
}
