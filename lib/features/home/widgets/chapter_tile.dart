import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/ui/animations.dart';

class ChapterTile extends StatelessWidget {
  final int number;
  final String title;
  final int wordCount;
  final bool isCurrent;
  final VoidCallback onTap;

  const ChapterTile({
    super.key,
    required this.number,
    required this.title,
    required this.onTap,
    this.wordCount = 0,
    this.isCurrent = false,
  });

  String get _meta {
    if (wordCount <= 0) return '';
    final minutes = (wordCount / 180).ceil();
    return '$wordCount சொற்கள் · ~$minutes நிமிடம்';
  }

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      pressedScale: 0.98,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isCurrent
              ? AppColors.primary.withValues(alpha: 0.07)
              : AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isCurrent
                ? AppColors.primary.withValues(alpha: 0.35)
                : Colors.transparent,
          ),
          boxShadow: isCurrent ? null : AppColors.softShadow,
        ),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              height: 42,
              width: 42,
              decoration: BoxDecoration(
                gradient: isCurrent ? AppColors.emberGradient : null,
                color: isCurrent ? null : AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(13),
              ),
              child: Center(
                child: Text(
                  number.toString(),
                  style: TextStyle(
                    color: isCurrent ? Colors.white : AppColors.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 15.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (_meta.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(
                          Icons.schedule_rounded,
                          size: 12,
                          color: AppColors.accent,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _meta,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: isCurrent
                  ? const Icon(
                      Icons.play_circle_fill_rounded,
                      key: ValueKey('current'),
                      color: AppColors.primary,
                      size: 26,
                    )
                  : const Icon(
                      Icons.chevron_right_rounded,
                      key: ValueKey('normal'),
                      color: AppColors.textSecondary,
                      size: 22,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
