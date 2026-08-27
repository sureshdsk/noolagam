import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

class ReadingProgressBar extends StatelessWidget {
  final double progress;
  final Color? labelColor;
  final bool showLabel;
  final bool animate;

  const ReadingProgressBar({
    super.key,
    required this.progress,
    this.labelColor,
    this.showLabel = true,
    this.animate = true,
  });

  @override
  Widget build(BuildContext context) {
    final label = labelColor ?? AppColors.textSecondary;
    final clamped = progress.clamp(0.0, 1.0);

    final bar = ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: animate ? 0.0 : clamped, end: clamped),
        duration: const Duration(milliseconds: 900),
        curve: Curves.easeOutCubic,
        builder: (context, value, _) => LinearProgressIndicator(
          value: value,
          minHeight: 8,
          backgroundColor: AppColors.secondary.withValues(alpha: 0.6),
          valueColor: const AlwaysStoppedAnimation(AppColors.button),
        ),
      ),
    );

    if (!showLabel) return bar;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        bar,
        const SizedBox(height: 8),
        Text(
          "${(clamped * 100).toInt()}% முடிந்தது",
          style: TextStyle(color: label, fontSize: 12),
        ),
      ],
    );
  }
}
