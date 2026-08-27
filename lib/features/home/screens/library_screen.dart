import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/ui/animations.dart';
import '../../../core/ui/page_transitions.dart';
import '../../../models/reading_progress.dart';
import '../../../services/api/book_service.dart';
import '../../../state/reading_progress_provider.dart';
import '../widgets/progress_bar.dart';
import 'book_details_screen.dart';

class LibraryScreen extends StatelessWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final books = context.watch<ReadingProgressProvider>().library;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FadeSlideIn(
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "நூலகம்",
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        "படித்து வரும் நூல்கள்",
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: books.isEmpty
                      ? const SizedBox.shrink()
                      : Container(
                          key: const ValueKey('count'),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            "${books.length} நூல்கள்",
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Expanded(
            child: books.isEmpty
                ? const _EmptyLibrary()
                : ListView.builder(
                    padding: const EdgeInsets.only(bottom: 8),
                    itemCount: books.length,
                    itemBuilder: (context, index) => FadeSlideIn(
                      delay: Duration(
                        milliseconds: (80 + index * 50).clamp(0, 400),
                      ),
                      child: _LibraryTile(progress: books[index]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            height: 88,
            width: 88,
            decoration: const BoxDecoration(
              color: AppColors.surfaceAlt,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.bookmark_border_rounded,
              size: 40,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            "நூலகம் காலியாக உள்ளது",
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            "படிக்கத் தொடங்கிய நூல்கள் இங்கே தோன்றும்",
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5),
          ),
        ],
      ),
    );
  }
}

class _LibraryTile extends StatelessWidget {
  final ReadingProgress progress;

  const _LibraryTile({required this.progress});

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(progress.bookId),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
      ),
      onDismissed: (_) =>
          context.read<ReadingProgressProvider>().remove(progress.bookId),
      child: Pressable(
        onTap: () => Navigator.push(
          context,
          FadeThroughRoute(
            builder: (_) => BookDetailsScreen(bookId: progress.bookId),
          ),
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: AppColors.softShadow,
          ),
          child: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: AppColors.softShadow,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 62,
                    height: 88,
                    child: CachedNetworkImage(
                      imageUrl: BookService.coverUrlFor(progress.bookId),
                      fit: BoxFit.cover,
                      placeholder: (_, __) =>
                          Container(color: AppColors.secondary),
                      errorWidget: (_, __, ___) => Container(
                        color: AppColors.secondary,
                        child: const Icon(
                          Icons.menu_book_rounded,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      progress.bookTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 16.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      progress.lastChapterTitle ??
                          'அத்தியாயம் ${progress.lastChapterIdx + 1}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ReadingProgressBar(
                      progress: progress.fraction,
                      showLabel: false,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  "${(progress.fraction * 100).toInt()}%",
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
