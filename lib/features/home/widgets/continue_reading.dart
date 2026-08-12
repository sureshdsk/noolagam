import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import 'progress_bar.dart';

class ContinueReading extends StatelessWidget {
  final String title;

  final String author;

  final double progress;

  final VoidCallback onTap;

  const ContinueReading({
    super.key,
    required this.title,
    required this.author,
    required this.progress,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,

      borderRadius: BorderRadius.circular(18),

      child: Container(
        padding: const EdgeInsets.all(18),

        decoration: BoxDecoration(
          color: Colors.grey.shade900,

          borderRadius: BorderRadius.circular(18),
        ),

        child: Row(
          children: [
            Container(
              width: 90,

              height: 130,

              decoration: BoxDecoration(
                color: AppColors.primary,

                borderRadius: BorderRadius.circular(15),
              ),

              child: const Icon(Icons.menu_book, color: Colors.white, size: 45),
            ),

            const SizedBox(width: 18),

            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,

                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                  const SizedBox(height: 6),

                  Text(author, style: const TextStyle(color: Colors.white70)),

                  const SizedBox(height: 18),

                  ReadingProgressBar(progress: progress),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
