/// Chapter table-of-contents entry as returned by the HTTP API (snake_case).
class ChapterToc {
  final int idx;
  final String? title;
  final int wordCount;
  final bool audioAvailable;
  final int? durationSecs;

  const ChapterToc({
    required this.idx,
    this.title,
    required this.wordCount,
    this.audioAvailable = false,
    this.durationSecs,
  });

  factory ChapterToc.fromJson(Map<String, dynamic> json) {
    return ChapterToc(
      idx: (json['idx'] as num?)?.toInt() ?? 0,
      title: json['title']?.toString(),
      wordCount: (json['word_count'] as num?)?.toInt() ?? 0,
      audioAvailable:
          json['audio_available'] == true || json['audio_available'] == 1,
      durationSecs: (json['duration_secs'] as num?)?.toInt(),
    );
  }

  String get displayTitle => (title == null || title!.isEmpty)
      ? 'அத்தியாயம் ${idx + 1}'
      : title!;
}

/// Full chapter content fetched from storage via a presigned URL (camelCase).
class ContentChapter {
  final String bookId;
  final int chapterIdx;
  final String title;
  final String lang;
  final int contentVersion;
  final List<Block> blocks;

  const ContentChapter({
    required this.bookId,
    required this.chapterIdx,
    required this.title,
    required this.lang,
    required this.contentVersion,
    required this.blocks,
  });

  factory ContentChapter.fromJson(Map<String, dynamic> json) {
    return ContentChapter(
      bookId: json['bookId']?.toString() ?? '',
      chapterIdx: (json['chapterIdx'] as num?)?.toInt() ?? 0,
      title: json['title']?.toString() ?? '',
      lang: json['lang']?.toString() ?? 'ta',
      contentVersion: (json['contentVersion'] as num?)?.toInt() ?? 1,
      blocks: (json['blocks'] as List<dynamic>)
          .map((e) => Block.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  String get displayTitle => title.isEmpty ? 'அத்தியாயம் ${chapterIdx + 1}' : title;

  /// Plain text of all blocks — useful for selection/sharing.
  String get plainText => blocks.map((b) => b.plainText).join('\n\n');
}

/// Typed semantic block union — the accessibility core contract.
/// Never render raw HTML; every block type has a dedicated renderer.
sealed class Block {
  const Block();

  factory Block.fromJson(Map<String, dynamic> json) {
    return switch (json['t']) {
      'h' => HeadingBlock(
          lvl: (json['lvl'] as num?)?.toInt() ?? 1,
          text: json['text']?.toString() ?? '',
        ),
      'p' => ParagraphBlock(text: json['text']?.toString() ?? ''),
      'img' => ImageBlock(
          key: json['key']?.toString() ?? '',
          alt: json['alt']?.toString(),
        ),
      'table' => TableBlock(
          header: json['header'] == true,
          rows: (json['rows'] as List<dynamic>? ?? [])
              .map((row) => (row as List<dynamic>)
                  .map((cell) => cell.toString())
                  .toList())
              .toList(),
        ),
      'quote' => QuoteBlock(
          text: json['text']?.toString() ?? '',
          cite: json['cite']?.toString(),
        ),
      'list' => ListBlock(
          ordered: json['ordered'] == true,
          items: (json['items'] as List<dynamic>? ?? [])
              .map((e) => e.toString())
              .toList(),
        ),
      _ => ParagraphBlock(text: json['text']?.toString() ?? ''),
    };
  }

  String get plainText;
}

class HeadingBlock extends Block {
  final int lvl;
  final String text;

  const HeadingBlock({required this.lvl, required this.text});

  @override
  String get plainText => text;
}

class ParagraphBlock extends Block {
  final String text;

  const ParagraphBlock({required this.text});

  @override
  String get plainText => text;
}

class ImageBlock extends Block {
  final String key;
  final String? alt;

  const ImageBlock({required this.key, required this.alt});

  @override
  String get plainText => alt ?? '';
}

class TableBlock extends Block {
  final bool header;
  final List<List<String>> rows;

  const TableBlock({required this.header, required this.rows});

  @override
  String get plainText => rows.map((r) => r.join('\t')).join('\n');
}

class QuoteBlock extends Block {
  final String text;
  final String? cite;

  const QuoteBlock({required this.text, this.cite});

  @override
  String get plainText => cite == null ? text : '$text — $cite';
}

class ListBlock extends Block {
  final bool ordered;
  final List<String> items;

  const ListBlock({required this.ordered, required this.items});

  @override
  String get plainText => items.join('\n');
}
