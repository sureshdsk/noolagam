import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

class BookCard extends StatelessWidget {
  final String title;
  final String author;

  const BookCard({super.key, required this.title, required this.author});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 160,
      margin: const EdgeInsets.only(right: 15),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 140,
              decoration: BoxDecoration(
                color: AppColors.secondary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Icon(Icons.menu_book_rounded, size: 60),
              ),
            ),

            const SizedBox(height: 15),

            Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
            ),

            const SizedBox(height: 6),

            Text(author, style: TextStyle(color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}
