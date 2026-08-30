import 'package:flutter/foundation.dart';

import '../models/book.dart';
import '../services/api/api_client.dart';
import '../services/api/book_service.dart';

/// Catalog state with page-based loading and substring search (`q`).
class CatalogProvider extends ChangeNotifier {
  CatalogProvider({BookService? service}) : _service = service ?? BookService();

  final BookService _service;

  BookService get service => _service;

  final List<Book> items = [];
  final Map<String, Book> _detailCache = {};

  String query = '';
  int _page = 0;
  int _total = -1;
  bool loading = false;
  String? error;

  bool get hasMore => _total < 0 || items.length < _total;
  int get total => _total;

  /// Cached detail (includes chapter TOC) for quick navigation.
  Book? cachedDetail(String bookId) => _detailCache[bookId];

  Future<void> loadFirstPage() => _load(reset: true);

  Future<void> loadNextPage() => _load(reset: false);

  Future<void> refresh() async {
    _detailCache.clear();
    await _load(reset: true);
  }

  Future<Book> getBookDetail(String bookId) async {
    final cached = _detailCache[bookId];
    if (cached != null) return cached;
    final book = await _service.getBook(bookId);
    _detailCache[bookId] = book;
    return book;
  }

  Future<void> setQuery(String q) async {
    final trimmed = q.trim();
    if (trimmed == query) return;
    query = trimmed;
    await _load(reset: true);
  }

  Future<void> _load({required bool reset}) async {
    if (loading) return;
    if (!reset && !hasMore) return;
    loading = true;
    error = null;
    if (reset) {
      items.clear();
      _page = 0;
      _total = -1;
    }
    notifyListeners();
    try {
      final page = await _service.getBooks(
        q: query.isEmpty ? null : query,
        page: _page + 1,
      );
      _page = page.page;
      _total = page.total;
      items.addAll(page.items);
    } on ApiException catch (e) {
      error = e.toString();
    } catch (e) {
      error = e.toString();
    }
    loading = false;
    notifyListeners();
  }
}
