import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/ui/animations.dart';
import '../../../core/ui/page_transitions.dart';
import '../../../core/ui/skeleton.dart';
import '../../../models/reading_progress.dart';
import '../../../services/api/book_service.dart';
import '../../../state/catalog_provider.dart';
import '../../../state/reading_progress_provider.dart';
import '../widgets/book_card.dart';
import '../widgets/continue_reading.dart';
import '../widgets/greeting_header.dart';
import '../widgets/quote_card.dart';
import '../widgets/section_title.dart';
import 'book_details_screen.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab>
    with AutomaticKeepAliveClientMixin<HomeTab> {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CatalogProvider>().loadFirstPage();
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final catalog = context.watch<CatalogProvider>();
    final progress = context.watch<ReadingProgressProvider>();

    return RefreshIndicator(
      color: AppColors.button,
      backgroundColor: AppColors.surface,
      onRefresh: () => catalog.refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const FadeSlideIn(child: GreetingHeader()),
            const SizedBox(height: 24),
            const FadeSlideIn(
              delay: Duration(milliseconds: 80),
              child: QuoteCard(),
            ),
            if (progress.continueReading != null) ...[
              const SizedBox(height: 24),
              FadeSlideIn(
                delay: const Duration(milliseconds: 160),
                child: _ContinueReadingCard(progress: progress.continueReading!),
              ),
            ],
            const SizedBox(height: 32),
            const FadeSlideIn(
              delay: Duration(milliseconds: 240),
              child: SectionTitle(title: "சமீபத்திய நூல்கள்"),
            ),
            const SizedBox(height: 16),
            if (catalog.error != null)
              _ErrorCard(
                message: catalog.error!,
                onRetry: () => catalog.refresh(),
              )
            else if (catalog.items.isEmpty && catalog.loading)
              const _CatalogSkeleton()
            else if (catalog.items.isEmpty)
              const _EmptyCatalog()
            else ...[
              SizedBox(
                height: 296,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: catalog.items.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 14),
                  itemBuilder: (context, index) {
                    final book = catalog.items[index];
                    return FadeSlideIn(
                      delay: Duration(
                        milliseconds: (240 + index * 50).clamp(0, 520),
                      ),
                      child: BookCard(
                        title: book.title,
                        author: book.author ?? '',
                        coverUrl: book.coverUrl,
                        onTap: () => _openBook(context, book.id),
                      ),
                    );
                  },
                ),
              ),
              if (catalog.loading)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(
                    child: SizedBox(
                      width: 26,
                      height: 26,
                      child: CircularProgressIndicator(strokeWidth: 2.6),
                    ),
                  ),
                )
              else if (catalog.hasMore)
                Center(
                  child: TextButton.icon(
                    onPressed: () => catalog.loadNextPage(),
                    icon: const Icon(Icons.expand_more_rounded, size: 20),
                    label: const Text("மேலும் ஏற்றுக"),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  void _openBook(BuildContext context, String bookId) {
    Navigator.push(
      context,
      FadeThroughRoute(builder: (_) => BookDetailsScreen(bookId: bookId)),
    );
  }
}

class _ContinueReadingCard extends StatelessWidget {
  final ReadingProgress progress;

  const _ContinueReadingCard({required this.progress});

  @override
  Widget build(BuildContext context) {
    return ContinueReading(
      title: progress.bookTitle,
      author: progress.bookAuthor ?? '',
      chapterLabel: progress.lastChapterTitle ??
          'அத்தியாயம் ${progress.lastChapterIdx + 1}',
      coverUrl: BookService.coverUrlFor(progress.bookId),
      progress: progress.fraction,
      onTap: () => Navigator.push(
        context,
        FadeThroughRoute(
          builder: (_) => BookDetailsScreen(bookId: progress.bookId),
        ),
      ),
    );
  }
}

class _CatalogSkeleton extends StatelessWidget {
  const _CatalogSkeleton();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 296,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (var i = 0; i < 3; i++) ...[
            if (i > 0) const SizedBox(width: 14),
            const Skeleton(width: 152, height: 296, borderRadius: BorderRadius.all(Radius.circular(18))),
          ],
        ],
      ),
    );
  }
}

class _EmptyCatalog extends StatelessWidget {
  const _EmptyCatalog();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Column(
        children: [
          Icon(
            Icons.library_books_rounded,
            color: AppColors.primary,
            size: 44,
          ),
          SizedBox(height: 14),
          Text(
            "இன்னும் நூல்கள் இல்லை",
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: 6),
          Text(
            "சுயவிவரம் தாவலில் EPUB பதிவேற்றலாம்",
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorCard({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.error.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.cloud_off_rounded,
            color: AppColors.error,
            size: 40,
          ),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13.5,
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text("மீண்டும் முயற்சி"),
          ),
        ],
      ),
    );
  }
}
