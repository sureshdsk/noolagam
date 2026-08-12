import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

class ReadingProgressBar extends StatelessWidget {
  final double progress;

  const ReadingProgressBar({super.key, required this.progress});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LinearProgressIndicator(
          value: progress,
          minHeight: 8,
          borderRadius: BorderRadius.circular(20),
          backgroundColor: Colors.grey.shade800,
          valueColor: AlwaysStoppedAnimation(AppColors.primary),
        ),

        const SizedBox(height: 8),

        Text(
          "${(progress * 100).toInt()}% முடிந்தது",
          style: const TextStyle(color: Colors.white70, fontSize: 12),
        ),
      ],
    );
  }
}
