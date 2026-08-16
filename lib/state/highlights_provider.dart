import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/highlight.dart';

/// Locally persisted text highlights per book.
///
/// Highlights are content-anchored (chapter/block/range) so they remain
/// valid across font-size changes and re-pagination.
class HighlightsProvider extends ChangeNotifier {
  static const _kHighlights = 'reader_highlights';

  HighlightsProvider(this._prefs) {
    try {
      final raw = _prefs.getString(_kHighlights);
      if (raw != null) {
        final map = jsonDecode(raw) as Map<String, dynamic>;
        _byBook = map.map(
          (k, v) => MapEntry(
            k,
            (v as List<dynamic>)
                .map((e) => Highlight.fromJson(e as Map<String, dynamic>))
                .toList(),
          ),
        );
      }
    } catch (_) {
      _byBook = {};
    }
  }

  final SharedPreferences _prefs;

  Map<String, List<Highlight>> _byBook = {};

  /// Every saved highlight keyed by book — for the global profile view.
  Map<String, List<Highlight>> get byBook => Map.unmodifiable(_byBook);

  List<Highlight> forBook(String bookId) =>
      _byBook[bookId] ?? const <Highlight>[];

  /// Highlights covering one block — used to tint a paragraph.
  List<Highlight> forBlock(String bookId, int chapterIdx, int blockIdx) =>
      forBook(bookId)
          .where((h) =>
              h.chapterIdx == chapterIdx && h.blockIdx == blockIdx)
          .toList();

  /// Adds a highlight, or removes the existing one when the exact same
  /// spot is saved again (toggle).
  void toggle(Highlight h) {
    final list = [...forBook(h.bookId)];
    final existing = list.indexWhere((e) => e.sameSpot(h));
    if (existing >= 0) {
      list.removeAt(existing);
    } else {
      list.add(h);
    }
    _save(h.bookId, list);
  }

  void remove(String id) {
    var changed = false;
    _byBook = _byBook.map((bookId, list) {
      final next = list.where((h) => h.id != id).toList();
      if (next.length != list.length) changed = true;
      return MapEntry(bookId, next);
    });
    if (changed) _notifyAndPersist();
  }

  void removeForBlock(String bookId, int chapterIdx, int blockIdx) {
    final list = forBook(bookId)
        .where((h) =>
            h.chapterIdx != chapterIdx || h.blockIdx != blockIdx)
        .toList();
    if (list.length == forBook(bookId).length) return;
    _save(bookId, list);
  }

  void _save(String bookId, List<Highlight> list) {
    _byBook[bookId] = list;
    _notifyAndPersist();
  }

  void _notifyAndPersist() {
    _prefs.setString(
      _kHighlights,
      jsonEncode(_byBook.map((k, v) => MapEntry(k, v.map((h) => h.toJson()).toList()))),
    );
    notifyListeners();
  }
}
