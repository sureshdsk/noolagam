import 'package:flutter_test/flutter_test.dart';

import 'package:tamil_ebook_reader/models/book.dart';
import 'package:tamil_ebook_reader/models/chapter.dart';
import 'package:tamil_ebook_reader/models/job.dart';
import 'package:tamil_ebook_reader/models/reading_progress.dart';

void main() {
  group('Book', () {
    test('parses list item', () {
      final book = Book.fromJson({
        'id': 'deiva_yaanai',
        'title': 'தெய்வ யானை',
        'author': null,
        'summary': null,
        'language': 'ta',
        'total_chapters': 24,
        'has_audio': 0,
        'a11y_score': 75,
        'content_version': 1,
        'published_at': '2026-08-01T00:00:00Z',
      });
      expect(book.id, 'deiva_yaanai');
      expect(book.totalChapters, 24);
      expect(book.hasAudio, isFalse);
      expect(book.a11yScore, 75);
      expect(book.chapters, isNull);
    });

    test('parses detail with TOC and computes hasMore', () {
      final page = BookPage.fromJson({
        'items': [
          {
            'id': 'b1',
            'title': 'நூல்',
            'language': 'ta',
            'total_chapters': 3,
            'chapters': [
              {'idx': 0, 'title': 'முதல்', 'word_count': 100},
              {'idx': 1, 'title': null, 'word_count': 0, 'audio_available': 1},
            ],
          }
        ],
        'page': 1,
        'limit': 20,
        'total': 30,
      });
      expect(page.items.single.chapters!.length, 2);
      expect(page.hasMore, isTrue);
      expect(page.items.single.chapters![1].displayTitle, 'அத்தியாயம் 2');
      expect(page.items.single.chapters![1].audioAvailable, isTrue);
    });
  });

  group('ContentChapter', () {
    test('parses all block types', () {
      final chapter = ContentChapter.fromJson({
        'bookId': 'b1',
        'chapterIdx': 2,
        'title': 'இரவு',
        'lang': 'ta',
        'contentVersion': 1,
        'blocks': [
          {'t': 'h', 'lvl': 1, 'text': 'தலைப்பு'},
          {'t': 'p', 'text': 'பத்தி'},
          {'t': 'img', 'key': 'books/b1/img/1.jpg', 'alt': 'கடல்'},
          {
            't': 'table',
            'header': true,
            'rows': [
              ['அ', 'ஆ'],
              ['இ', 'ஈ'],
            ],
          },
          {'t': 'quote', 'text': 'மேற்கோள்', 'cite': 'ஆசிரியர்'},
          {'t': 'list', 'ordered': true, 'items': ['ஒன்று', 'இரண்டு']},
          {'t': 'unknown', 'text': 'விதிவிலக்கு'},
        ],
      });

      expect(chapter.blocks.length, 7);
      expect(chapter.blocks[0], isA<HeadingBlock>());
      expect((chapter.blocks[0] as HeadingBlock).lvl, 1);
      expect(chapter.blocks[1], isA<ParagraphBlock>());
      expect(chapter.blocks[2], isA<ImageBlock>());
      expect((chapter.blocks[2] as ImageBlock).alt, 'கடல்');
      expect(chapter.blocks[3], isA<TableBlock>());
      expect((chapter.blocks[3] as TableBlock).rows.length, 2);
      expect(chapter.blocks[4], isA<QuoteBlock>());
      expect(chapter.blocks[5], isA<ListBlock>());
      expect((chapter.blocks[5] as ListBlock).ordered, isTrue);
      // Unknown types fall back to a paragraph rather than crashing.
      expect(chapter.blocks[6], isA<ParagraphBlock>());
      expect(chapter.plainText, contains('தலைப்பு'));
    });
  });

  group('Job', () {
    test('status helpers', () {
      final job = Job.fromJson({
        'id': 'j1',
        'book_id': 'b1',
        'type': 'process_epub',
        'status': 'completed',
        'created_at': '2026-08-01T00:00:00Z',
        'updated_at': '2026-08-01T00:01:00Z',
      });
      expect(job.isTerminal, isTrue);
      expect(job.typeLabel, 'EPUB செயலாக்கம்');
      expect(job.statusLabel, 'முடிந்தது');
    });
  });

  group('ReadingProgress', () {
    test('JSON roundtrip and fraction', () {
      final p = ReadingProgress(
        bookId: 'b1',
        bookTitle: 'நூல்',
        totalChapters: 10,
        lastChapterIdx: 4,
        updatedAt: DateTime.utc(2026, 8, 1),
      );
      final restored = ReadingProgress.fromJson(p.toJson());
      expect(restored.bookId, 'b1');
      expect(restored.lastChapterIdx, 4);
      expect(restored.fraction, closeTo(0.5, 0.001));
    });

    test('legacy JSON without page fields parses and keeps chapter fraction', () {
      final restored = ReadingProgress.fromJson({
        'book_id': 'b1',
        'book_title': 'நூல்',
        'total_chapters': 10,
        'last_chapter_idx': 3,
        'last_chapter_title': 'நான்கு',
        'updated_at': '2026-08-01T00:00:00Z',
      });
      expect(restored.lastPageIdx, isNull);
      expect(restored.lastPageCount, isNull);
      // Whole chapter counts as read — same as the pre-pagination value.
      expect(restored.fraction, closeTo(0.4, 0.001));
    });

    test('page fields roundtrip and refine the fraction', () {
      final p = ReadingProgress(
        bookId: 'b1',
        bookTitle: 'நூல்',
        totalChapters: 10,
        lastChapterIdx: 4,
        lastPageIdx: 0,
        lastPageCount: 4,
        updatedAt: DateTime.utc(2026, 8, 1),
      );
      final restored = ReadingProgress.fromJson(p.toJson());
      expect(restored.lastPageIdx, 0);
      expect(restored.lastPageCount, 4);
      // Chapter 5 of 10, page 1 of 4 → (4 + 0.25) / 10.
      expect(restored.fraction, closeTo(0.425, 0.001));
    });

    test('finishing the last page of the last chapter completes the book', () {
      final p = ReadingProgress(
        bookId: 'b1',
        bookTitle: 'நூல்',
        totalChapters: 10,
        lastChapterIdx: 9,
        lastPageIdx: 6,
        lastPageCount: 7,
        updatedAt: DateTime.utc(2026, 8, 1),
      );
      expect(p.fraction, 1.0);
    });
  });
}
