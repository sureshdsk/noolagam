import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/ui/animations.dart';
import '../../../models/highlight.dart';
import '../../../models/job.dart';
import '../../../state/highlights_provider.dart';
import '../../../state/jobs_provider.dart';
import '../../../state/reading_progress_provider.dart';
import 'reader_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _adminKeyController = TextEditingController();
  final _bookIdController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final jobs = context.read<JobsProvider>();
    _adminKeyController.text = jobs.adminKey;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      jobs.loadJobs();
    });
  }

  @override
  void dispose() {
    _adminKeyController.dispose();
    _bookIdController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUpload(BuildContext context) async {
    final jobs = context.read<JobsProvider>();
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['epub'],
      withData: false,
    );
    if (result == null || result.files.single.path == null) return;

    await jobs.uploadEpub(
      result.files.single.path!,
      bookId: _bookIdController.text,
    );

    if (!context.mounted) return;
    final error = context.read<JobsProvider>().uploadError;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          error != null
              ? "பதிவேற்றம் தோல்வி: $error"
              : "EPUB பதிவேற்றப்பட்டது — செயலாக்கம் தொடங்கியது",
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final jobs = context.watch<JobsProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const FadeSlideIn(child: _Header()),
          const SizedBox(height: 20),
          const FadeSlideIn(
            delay: Duration(milliseconds: 40),
            child: _SavedHighlightsSection(),
          ),
          const SizedBox(height: 28),
          const FadeSlideIn(
            delay: Duration(milliseconds: 80),
            child: _SectionHeader(
              icon: Icons.admin_panel_settings_rounded,
              title: "நிர்வாகம்",
            ),
          ),
          const SizedBox(height: 12),
          FadeSlideIn(
            delay: const Duration(milliseconds: 120),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(22),
                boxShadow: AppColors.softShadow,
              ),
              child: Column(
                children: [
                  TextField(
                    controller: _adminKeyController,
                    decoration: const InputDecoration(
                      labelText: "Admin API Key",
                      prefixIcon: Icon(Icons.key_rounded),
                    ),
                    onSubmitted: (value) =>
                        context.read<JobsProvider>().setAdminKey(value),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _bookIdController,
                    decoration: const InputDecoration(
                      labelText: "நூல் அடையாளம் (bookId) — விருப்பம்",
                      prefixIcon: Icon(Icons.badge_outlined),
                      helperText: "காலியாக விட்டால் கோப்பு பெயரிலிருந்து உருவாக்கப்படும்",
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: jobs.uploading
                          ? null
                          : () => _pickAndUpload(context),
                      icon: jobs.uploading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.upload_file_rounded),
                      label: Text(
                        jobs.uploading
                            ? "பதிவேற்றுகிறது... ${(jobs.uploadProgress * 100).toInt()}%"
                            : "EPUB பதிவேற்று",
                      ),
                    ),
                  ),
                  if (jobs.uploadError != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      jobs.uploadError!,
                      style: const TextStyle(
                        color: AppColors.error,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 28),
          FadeSlideIn(
            delay: const Duration(milliseconds: 160),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const _SectionHeader(
                  icon: Icons.work_history_rounded,
                  title: "செயலாக்க வேலைகள்",
                ),
                IconButton(
                  onPressed: () => context.read<JobsProvider>().loadJobs(),
                  icon: const Icon(
                    Icons.refresh_rounded,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          if (jobs.jobs.isEmpty)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 6),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Center(
                child: Text(
                  "வேலைகள் இல்லை",
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ),
            )
          else
            ...jobs.jobs.map((job) => _JobTile(job: job)),
          const SizedBox(height: 28),
          const FadeSlideIn(
            delay: Duration(milliseconds: 200),
            child: _SectionHeader(
              icon: Icons.settings_rounded,
              title: "அமைப்புகள்",
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(22),
              boxShadow: AppColors.softShadow,
            ),
            child: Column(
              children: [
                _SettingsRow(
                  icon: Icons.dns_rounded,
                  label: "API",
                  value: ApiConfig.baseUrl,
                ),
                Divider(height: 1, color: AppColors.border),
                _SettingsRow(
                  icon: Icons.info_outline_rounded,
                  label: "பதிப்பு",
                  value: "1.0.0",
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          height: 56,
          width: 56,
          decoration: BoxDecoration(
            gradient: AppColors.emberGradient,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.3),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: const Icon(
            Icons.person_rounded,
            color: Colors.white,
            size: 28,
          ),
        ),
        const SizedBox(width: 14),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "சுயவிவரம்",
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            SizedBox(height: 3),
            Text(
              "ஓலைச்சுவடி — தமிழ் வாசிப்பகம்",
              style: TextStyle(
                fontSize: 13.5,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;

  const _SectionHeader({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          height: 34,
          width: 34,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _SettingsRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 14,
            ),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// Every saved highlight across all books, grouped by book (most recent
/// first). Tapping one reopens its book at the highlighted chapter.
class _SavedHighlightsSection extends StatelessWidget {
  const _SavedHighlightsSection();

  @override
  Widget build(BuildContext context) {
    final byBook = context.watch<HighlightsProvider>().byBook;
    final progress = context.watch<ReadingProgressProvider>();

    final header = Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const _SectionHeader(
          icon: Icons.bookmark_rounded,
          title: "சேமித்த ஹைலைட்கள்",
        ),
        if (byBook.isNotEmpty)
          Text(
            '${byBook.values.expand((l) => l).length}',
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
            ),
          ),
      ],
    );

    if (byBook.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          header,
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surfaceAlt.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Text(
              "இன்னும் ஹைலைட் இல்லை. வாசிக்கும் போது உரையை தேர்ந்தெடுத்து 'ஹைலைட்' அழுத்துங்கள்.",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13.5),
            ),
          ),
        ],
      );
    }

    // Books ordered by their most recent highlight.
    final bookIds = byBook.keys.toList()
      ..sort((a, b) => _latest(byBook[b]!).compareTo(_latest(byBook[a]!)));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        header,
        const SizedBox(height: 12),
        for (final bookId in bookIds)
          for (final h in _sorted(byBook[bookId]!))
            _ProfileHighlightRow(
              highlight: h,
              bookTitle: progress.forBook(bookId)?.bookTitle,
              canOpen: progress.forBook(bookId) != null,
            ),
      ],
    );
  }

  static DateTime _latest(List<Highlight> list) => list
      .map((h) => h.createdAt)
      .reduce((a, b) => a.isAfter(b) ? a : b);

  static List<Highlight> _sorted(List<Highlight> list) => [...list]..sort(
        (a, b) {
          final byChapter = a.chapterIdx.compareTo(b.chapterIdx);
          return byChapter != 0 ? byChapter : a.start.compareTo(b.start);
        },
      );
}

class _ProfileHighlightRow extends StatelessWidget {
  final Highlight highlight;
  final String? bookTitle;
  final bool canOpen;

  const _ProfileHighlightRow({
    required this.highlight,
    required this.bookTitle,
    required this.canOpen,
  });

  void _open(BuildContext context) {
    final progress =
        context.read<ReadingProgressProvider>().forBook(highlight.bookId);
    if (progress == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReaderScreen(
          bookId: highlight.bookId,
          bookTitle: progress.bookTitle,
          bookAuthor: progress.bookAuthor,
          totalChapters: progress.totalChapters,
          initialIdx: highlight.chapterIdx,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: canOpen ? () => _open(context) : null,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: AppColors.softShadow,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 4,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    highlight.text,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13.5,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    [
                      if (bookTitle != null && bookTitle!.isNotEmpty)
                        bookTitle!,
                      highlight.chapterLabel,
                    ].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: () =>
                  context.read<HighlightsProvider>().remove(highlight.id),
              icon: const Icon(Icons.delete_outline_rounded),
              iconSize: 19,
              color: AppColors.textSecondary,
              tooltip: "நீக்கு",
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
      ),
    );
  }
}

class _JobTile extends StatelessWidget {
  final Job job;

  const _JobTile({required this.job});

  @override
  Widget build(BuildContext context) {
    final (color, bgColor) = switch (job.status) {
      'completed' => (AppColors.success, AppColors.success),
      'failed' => (AppColors.error, AppColors.error),
      'running' => (Color(0xFFB7791F), Color(0xFFB7791F)),
      _ => (AppColors.textSecondary, AppColors.textSecondary),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppColors.softShadow,
      ),
      child: Row(
        children: [
          if (!job.isTerminal)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2.2),
            )
          else
            Container(
              height: 20,
              width: 20,
              decoration: BoxDecoration(
                color: bgColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                job.status == 'completed'
                    ? Icons.check_rounded
                    : Icons.priority_high_rounded,
                color: color,
                size: 14,
              ),
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "${job.typeLabel}${job.bookId != null ? ' · ${job.bookId}' : ''}",
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  job.status == 'failed' && job.error != null
                      ? "${job.statusLabel}: ${job.error!}"
                      : job.statusLabel,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: color, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
