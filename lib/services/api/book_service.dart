import '../../models/book.dart';
import 'api_service.dart';

class BookService {
  static final ApiService _api = ApiService();

  static Future<List<Book>> getBooks() async {
    final response = await _api.get('/books');

    return (response as List).map((e) => Book.fromJson(e)).toList();
  }

  static Future<Book> getBook(String id) async {
    final response = await _api.get('/books/$id');

    return Book.fromJson(response);
  }

  static Future<List<Book>> searchBooks(String keyword) async {
    final response = await _api.get('/books/search?q=$keyword');

    return (response as List).map((e) => Book.fromJson(e)).toList();
  }

  static Future<void> addToLibrary(String bookId) async {
    await _api.post('/library/add', {"book_id": bookId});
  }

  static Future<List<Book>> getContinueReading() async {
    final response = await _api.get('/library/continue');

    return (response as List).map((e) => Book.fromJson(e)).toList();
  }
}
