import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/ui/animations.dart';
import '../../../core/ui/page_transitions.dart';
import '../../../core/ui/skeleton.dart';
import '../../../models/book.dart';
import '../../../models/chapter.dart';
import '../../../services/api/api_client.dart';
import '../../../state/catalog_provider.dart';
import '../../../state/reading_progress_provider.dart';
import '../widgets/chapter_tile.dart';
import '../widgets/progress_bar.dart';
import 'reader_screen.dart';

class BookDetailsScreen extends StatefulWidget {
  final String bookId;

  const BookDetailsScreen({super.key, required this.bookId});

  @override
  State<BookDetailsScreen> createState() => _BookDetailsScreenState();
}

class _BookDetailsScreenState extends State<BookDetailsScreen> {
  Future<Book>? _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<CatalogProvider>().getBookDetail(widget.bookId);
  }

  void _reload() {
    setState(() {
      _future = context.read<CatalogProvider>().getBookDetail(widget.bookId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(
            Icons.arrow_back_rounded,
            color: AppColors.textPrimary,
          ),
        ),
        title: const Text(
          "நூல் விவரம்",
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: FutureBuilder<Book>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const _DetailsSkeleton();
          }
          if (snapshot.hasError) {
            return _ErrorState(
              error: snapshot.error!,
              onRetry: _reload,
            );
          }
          final book = snapshot.data!;
          return _BookDetails(book: book, onRetry: _reload);
        },
      ),
    );
  }
}

class _BookDetails extends StatelessWidget {
  final Book book;
  final VoidCallback onRetry;

  const _BookDetails({required this.book, required this.onRetry});

  void _openReader(
    BuildContext context, {
    int? chapterIdx,
    int? pageIdx,
  }) {
    Navigator.push(
      context,
      RiseRoute(
        builder: (_) => ReaderScreen(
          bookId: book.id,
          bookTitle: book.title,
          bookAuthor: book.author,
          totalChapters: book.totalChapters,
          initialIdx: chapterIdx ?? 0,
          initialPageIdx: pageIdx,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final progress = context.watch<ReadingProgressProvider>().forBook(book.id);
    final chapters = book.chapters ?? const <ChapterToc>[];
    final currentIdx = progress?.lastChapterIdx;

    return RefreshIndicator(
      color: AppColors.button,
      backgroundColor: AppColors.surface,
      onRefresh: () async {
        await context.read<CatalogProvider>().refresh();
        onRetry();
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          FadeSlideIn(
            child: Center(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    height: 246,
                    width: 246,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AppColors.parchmentGradient,
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryDeep.withValues(alpha: 0.3),
                          blurRadius: 30,
                          offset: const Offset(0, 14),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: SizedBox(
                        width: 182,
                        height: 254,
                        child: CachedNetworkImage(
                          imageUrl: book.coverUrl,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(
                            color: AppColors.secondary,
                            child: const Icon(
                              Icons.menu_book_rounded,
                              size: 60,
                              color: AppColors.primary,
                            ),
                          ),
                          errorWidget: (_, __, ___) => Container(
                            color: AppColors.secondary,
                            child: const Icon(
                              Icons.menu_book_rounded,
                              size: 60,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 28),
          FadeSlideIn(
            delay: const Duration(milliseconds: 80),
            child: Text(
              book.title,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 25,
                height: 1.3,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (book.author != null && book.author!.isNotEmpty) ...[
            const SizedBox(height: 8),
            FadeSlideIn(
              delay: const Duration(milliseconds: 120),
              child: Row(
                children: [
                  const Icon(
                    Icons.edit_rounded,
                    size: 15,
                    color: AppColors.button,
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      book.author!,
                      style: const TextStyle(
                        color: AppColors.button,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          FadeSlideIn(
            delay: const Duration(milliseconds: 160),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _Chip(
                  icon: Icons.format_list_numbered_rounded,
                  label: "${book.totalChapters} அத்தியாயங்கள்",
                ),
                _Chip(
                  icon: Icons.translate_rounded,
                  label: book.language == 'ta' ? 'தமிழ்' : book.language,
                ),
                if (book.a11yScore != null)
                  _Chip(
                    icon: Icons.accessibility_new_rounded,
                    label: "அணுகல் ${book.a11yScore}/100",
                  ),
              ],
            ),
          ),
          if (progress != null) ...[
            const SizedBox(height: 22),
            FadeSlideIn(
              delay: const Duration(milliseconds: 200),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: AppColors.softShadow,
                ),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        "வாசிப்பு முன்னேற்றம்",
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Text(
                      "${(progress.fraction * 100).toInt()}%",
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            FadeSlideIn(
              delay: const Duration(milliseconds: 220),
              child: ReadingProgressBar(
                progress: progress.fraction,
                showLabel: false,
              ),
            ),
          ],
          const SizedBox(height: 24),
          FadeSlideIn(
            delay: const Duration(milliseconds: 240),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: AppColors.parchmentGradient,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(
                        Icons.notes_rounded,
                        size: 17,
                        color: AppColors.primary,
                      ),
                      SizedBox(width: 7),
                      Text(
                        "சுருக்கம்",
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    (book.summary == null || book.summary!.isEmpty)
                        ? "இந்த நூலுக்கு சுருக்கம் இன்னும் உருவாக்கப்படவில்லை."
                        : book.summary!,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      height: 1.8,
                      fontSize: 14.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 26),
          FadeSlideIn(
            delay: const Duration(milliseconds: 280),
            child: ElevatedButton.icon(
              onPressed: book.totalChapters == 0
                  ? null
                  : () => _openReader(
                        context,
                        chapterIdx: currentIdx,
                        pageIdx: currentIdx == null
                            ? null
                            : progress?.lastPageIdx,
                      ),
              icon: const Icon(Icons.menu_book_rounded),
              label: Text(
                currentIdx == null
                    ? "படிக்க தொடங்கு"
                    : "தொடர்ந்து படி — அத்தியாயம் ${currentIdx + 1}",
              ),
            ),
          ),
          const SizedBox(height: 34),
          if (chapters.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Center(
                child: Text(
                  "அத்தியாயப் பட்டியல் கிடைக்கவில்லை",
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ),
            )
          else ...[
            SectionHeader("அத்தியாயங்கள் (${chapters.length})"),
            const SizedBox(height: 14),
            ...chapters.map(
              (c) => FadeSlideIn(
                delay: Duration(
                  milliseconds: (300 + c.idx * 35).clamp(0, 650),
                ),
                child: ChapterTile(
                  number: c.idx + 1,
                  title: c.displayTitle,
                  wordCount: c.wordCount,
                  isCurrent: currentIdx == c.idx,
                  onTap: () => _openReader(context, chapterIdx: c.idx),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;

  const SectionHeader(this.title, {super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 18,
          decoration: BoxDecoration(
            gradient: AppColors.emberGradient,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 19,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _Chip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: AppColors.softShadow,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: AppColors.primary),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailsSkeleton extends StatelessWidget {
  const _DetailsSkeleton();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 12),
          const Skeleton(
            width: 190,
            height: 262,
            borderRadius: BorderRadius.all(Radius.circular(20)),
          ),
          const SizedBox(height: 28),
          Skeleton(width: 240, height: 24, borderRadius: BorderRadius.circular(8)),
          const SizedBox(height: 12),
          Skeleton(width: 140, height: 16, borderRadius: BorderRadius.circular(8)),
          const SizedBox(height: 24),
          Skeleton(height: 130),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;

  const _ErrorState({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final message = error is ApiException
        ? (error as ApiException).toString()
        : error.toString();
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(30),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              color: AppColors.primary,
              size: 46,
            ),
            const SizedBox(height: 14),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text("மீண்டும் முயற்சி"),
            ),
          ],
        ),
      ),
    );
  }
}
