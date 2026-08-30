import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/ui/animations.dart';
import '../../../core/ui/page_transitions.dart';
import '../../../core/ui/skeleton.dart';
import '../../../models/book.dart';
import '../../../models/chapter.dart';
import '../../../models/review.dart';
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
          const SizedBox(height: 32),
          BookReviewsSection(bookId: book.id),
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

class BookReviewsSection extends StatefulWidget {
  final String bookId;

  const BookReviewsSection({super.key, required this.bookId});

  @override
  State<BookReviewsSection> createState() => _BookReviewsSectionState();
}

class _BookReviewsSectionState extends State<BookReviewsSection> {
  List<Review>? _reviews;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadReviews();
  }

  Future<void> _loadReviews() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final reviewsList = await context.read<CatalogProvider>().service.getReviews(widget.bookId);
      setState(() {
        _reviews = reviewsList;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  double get _averageRating {
    if (_reviews == null || _reviews!.isEmpty) return 0.0;
    final total = _reviews!.fold(0, (sum, r) => sum + r.rating);
    return total / _reviews!.length;
  }

  Map<int, int> get _ratingDistribution {
    final dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    if (_reviews == null) return dist;
    for (var r in _reviews!) {
      dist[r.rating] = (dist[r.rating] ?? 0) + 1;
    }
    return dist;
  }

  void _openAddReviewSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => _AddReviewSheet(
        bookId: widget.bookId,
        onReviewSubmitted: (newReview) {
          setState(() {
            _reviews = [newReview, ...?_reviews];
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('BookReviewsSection: build called, reviews: ${_reviews?.length}, loading: $_loading, error: $_error');
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: CircularProgressIndicator(color: AppColors.button),
        ),
      );
    }

    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          children: [
            Text(
              "விமர்சனங்களை ஏற்ற முடியவில்லை: $_error",
              style: const TextStyle(color: AppColors.error, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _loadReviews,
              icon: const Icon(Icons.refresh_rounded, size: 16, color: AppColors.button),
              label: const Text("மீண்டும் முயலவும்", style: TextStyle(color: AppColors.button)),
            )
          ],
        ),
      );
    }

    final reviewsList = _reviews ?? [];
    final dist = _ratingDistribution;
    final totalReviews = reviewsList.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader("மதிப்பீடுகள் & விமர்சனங்கள்"),
        const SizedBox(height: 18),
        if (reviewsList.isNotEmpty) ...[
          // Aggregate Rating Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
              boxShadow: AppColors.softShadow,
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    // Average column
                    Expanded(
                      flex: 3,
                      child: Column(
                        children: [
                          Text(
                            _averageRating.toStringAsFixed(1),
                            style: const TextStyle(
                              fontSize: 48,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(5, (index) {
                              final starVal = index + 1;
                              if (starVal <= _averageRating.floor()) {
                                  return const Icon(Icons.star_rounded, color: AppColors.accent, size: 18);
                                } else if (starVal - 1 < _averageRating && _averageRating < starVal) {
                                  return const Icon(Icons.star_half_rounded, color: AppColors.accent, size: 18);
                                }
                                return Icon(Icons.star_outline_rounded, color: AppColors.textSecondary.withValues(alpha: 0.3), size: 18);
                              }),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              "$totalReviews விமர்சனங்கள்",
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        height: 80,
                        width: 1,
                        color: AppColors.border,
                        margin: const EdgeInsets.symmetric(horizontal: 12),
                      ),
                      // Star bars
                      Expanded(
                        flex: 5,
                        child: Column(
                          children: List.generate(5, (index) {
                            final star = 5 - index;
                            final count = dist[star] ?? 0;
                            final pct = totalReviews == 0 ? 0.0 : count / totalReviews;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Row(
                                children: [
                                  Text(
                                    "$star",
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.star_rounded, color: AppColors.accent, size: 12),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(4),
                                      child: Container(
                                        height: 6,
                                        color: AppColors.surfaceAlt,
                                        child: Align(
                                          alignment: Alignment.centerLeft,
                                          child: FractionallySizedBox(
                                            widthFactor: pct,
                                            child: Container(
                                              color: AppColors.button,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Divider(color: AppColors.border, height: 1),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _openAddReviewSheet,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.button,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: const Icon(Icons.rate_review_rounded, size: 18),
                      label: const Text(
                        "விமர்சனம் எழுதுக",
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            // Reviews List
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: reviewsList.length,
              separatorBuilder: (_, __) => const SizedBox(height: 14),
              itemBuilder: (context, idx) {
                final review = reviewsList[idx];
                final dateStr = "${review.createdAt.year}-${review.createdAt.month.toString().padLeft(2, '0')}-${review.createdAt.day.toString().padLeft(2, '0')}";
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.border),
                    boxShadow: AppColors.softShadow,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
                            backgroundColor: AppColors.surfaceAlt,
                            child: Text(
                              review.userId.substring(0, 1).toUpperCase(),
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  review.userId,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  dateStr,
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            children: List.generate(5, (index) {
                              return Icon(
                                index < review.rating ? Icons.star_rounded : Icons.star_outline_rounded,
                                color: AppColors.accent,
                                size: 15,
                              );
                            }),
                          ),
                        ],
                      ),
                      if (review.reviewText.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          review.reviewText,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 13.5,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ] else ...[
            // Empty State
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
                boxShadow: AppColors.softShadow,
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.rate_review_outlined,
                    color: AppColors.textSecondary.withValues(alpha: 0.4),
                    size: 44,
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    "விமர்சனங்கள் இன்னும் எழுதப்படவில்லை.",
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    "முதல் விமர்சனத்தை நீங்களே எழுதுங்கள்!",
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: _openAddReviewSheet,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.button,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: const Icon(Icons.rate_review_rounded, size: 16),
                    label: const Text(
                      "முதல் விமர்சனத்தை எழுதுக",
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      );
    }
  }

class _AddReviewSheet extends StatefulWidget {
  final String bookId;
  final Function(Review) onReviewSubmitted;

  const _AddReviewSheet({required this.bookId, required this.onReviewSubmitted});

  @override
  State<_AddReviewSheet> createState() => _AddReviewSheetState();
}

class _AddReviewSheetState extends State<_AddReviewSheet> {
  int _selectedRating = 5;
  final TextEditingController _textController = TextEditingController();
  bool _submitting = false;
  String? _error;

  Future<void> _submit() async {
    final text = _textController.text.trim();
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final newReview = await context.read<CatalogProvider>().service.addReview(
        widget.bookId,
        _selectedRating,
        text,
      );
      widget.onReviewSubmitted(newReview);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = e.toString();
        _submitting = false;
      });
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "விமர்சனம் எழுதுக",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 18),
          // Interactive rating selector
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(5, (index) {
                final starVal = index + 1;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedRating = starVal;
                    });
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: Icon(
                      _selectedRating >= starVal ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: AppColors.accent,
                      size: 40,
                    ),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 20),
          // Text field for review text
          TextField(
            controller: _textController,
            maxLines: 4,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: "இந்த நூலைப் பற்றிய உங்கள் கருத்துக்களை இங்கே எழுதவும்...",
              hintStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13.5),
              fillColor: AppColors.surface,
              filled: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.button, width: 1.5),
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: const TextStyle(color: AppColors.error, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.button,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: _submitting
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : const Text(
                    "சமர்ப்பி",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
          ),
        ],
      ),
    );
  }
}

