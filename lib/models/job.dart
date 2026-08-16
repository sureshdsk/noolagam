/// Async pipeline job as returned by `GET /v1/jobs/:id`.
class Job {
  final String id;
  final String? bookId;
  final String type;
  final String status;
  final String? error;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Job({
    required this.id,
    this.bookId,
    required this.type,
    required this.status,
    this.error,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Job.fromJson(Map<String, dynamic> json) {
    return Job(
      id: json['id'].toString(),
      bookId: json['book_id']?.toString(),
      type: json['type']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      error: json['error']?.toString(),
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      updatedAt: DateTime.tryParse(json['updated_at']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  bool get isTerminal => status == 'completed' || status == 'failed';

  String get typeLabel => switch (type) {
        'process_epub' => 'EPUB செயலாக்கம்',
        'generate_summaries' => 'சுருக்க உருவாக்கம்',
        _ => type,
      };

  String get statusLabel => switch (status) {
        'pending' => 'காத்திருக்கிறது',
        'running' => 'நடைபெறுகிறது',
        'completed' => 'முடிந்தது',
        'failed' => 'தோல்வி',
        _ => status,
      };
}
