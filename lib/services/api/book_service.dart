import '../../core/config.dart';
import '../../models/book.dart';
import '../../models/chapter.dart';
import 'api_client.dart';

/// Client for `/v1/books*` endpoints: catalog, detail, chapter content.
class BookService {
  BookService({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  static String coverUrlFor(String bookId) => ApiConfig.coverUrl(bookId);

  /// Lists published books, newest first.
  Future<BookPage> getBooks({String? q, int page = 1, int limit = 20}) async {
    final json = await _client.getJson(
      '/books',
      query: {
        if (q != null && q.isNotEmpty) 'q': q,
        'page': page,
        'limit': limit,
      },
    );
    return BookPage.fromJson(json);
  }

  /// Book detail including the chapter TOC.
  Future<Book> getBook(String bookId) async {
    final json = await _client.getJson('/books/$bookId');
    return Book.fromJson(json);
  }

  /// Fetches full chapter content: presign via the API, then download the
  /// block-model JSON from object storage.
  Future<ContentChapter> getChapter(String bookId, int idx) async {
    final presigned = await _client.getJson(
      '/books/$bookId/chapters/$idx',
      authenticated: true,
    );
    final url = presigned['url']?.toString();
    if (url == null || url.isEmpty) {
      throw const ApiException(
        type: 'presign_unavailable',
        title: 'அத்தியாய உள்ளடக்கம் கிடைக்கவில்லை',
      );
    }
    final chapterJson = await _client.getAbsoluteJson(url);
    return ContentChapter.fromJson(chapterJson);
  }
}
