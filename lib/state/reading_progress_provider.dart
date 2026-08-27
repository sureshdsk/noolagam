import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/reading_progress.dart';

/// Tracks the last-read chapter per book, locally.
class ReadingProgressProvider extends ChangeNotifier {
  static const _kProgress = 'reading_progress';

  ReadingProgressProvider(this._prefs) {
    try {
      final raw = _prefs.getString(_kProgress);
      if (raw != null) {
        final map = jsonDecode(raw) as Map<String, dynamic>;
        _byBook = map.map(
          (k, v) => MapEntry(k, ReadingProgress.fromJson(v as Map<String, dynamic>)),
        );
      }
    } catch (_) {
      _byBook = {};
    }
  }

  final SharedPreferences _prefs;

  Map<String, ReadingProgress> _byBook = {};
  Map<String, ReadingProgress> get byBook => Map.unmodifiable(_byBook);

  ReadingProgress? forBook(String bookId) => _byBook[bookId];

  /// Most recently touched book, for the Continue Reading card.
  ReadingProgress? get continueReading {
    if (_byBook.isEmpty) return null;
    final list = _byBook.values.toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return list.first;
  }

  /// Library view: books with progress, most recent first.
  List<ReadingProgress> get library {
    final list = _byBook.values.toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return list;
  }

  void record({
    required String bookId,
    required String bookTitle,
    String? bookAuthor,
    required int totalChapters,
    required int chapterIdx,
    String? chapterTitle,
    int? pageIdx,
    int? pageCount,
  }) {
    _byBook[bookId] = ReadingProgress(
      bookId: bookId,
      bookTitle: bookTitle,
      bookAuthor: bookAuthor,
      totalChapters: totalChapters,
      lastChapterIdx: chapterIdx,
      lastChapterTitle: chapterTitle,
      lastPageIdx: pageIdx,
      lastPageCount: pageCount,
      updatedAt: DateTime.now(),
    );
    _persist();
    notifyListeners();
  }

  void remove(String bookId) {
    if (_byBook.remove(bookId) == null) return;
    _persist();
    notifyListeners();
  }

  void _persist() {
    _prefs.setString(
      _kProgress,
      jsonEncode(_byBook.map((k, v) => MapEntry(k, v.toJson()))),
    );
  }
}
