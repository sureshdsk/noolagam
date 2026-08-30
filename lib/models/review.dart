/// A single user review for a book.
class Review {
  final String id;
  final String bookId;
  final String userId;
  final int rating;
  final String reviewText;
  final DateTime createdAt;

  const Review({
    required this.id,
    required this.bookId,
    required this.userId,
    required this.rating,
    required this.reviewText,
    required this.createdAt,
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id']?.toString() ?? '',
      bookId: json['book_id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      rating: (json['rating'] as num?)?.toInt() ?? 0,
      reviewText: json['review_text']?.toString() ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now(),
    );
  }
}
