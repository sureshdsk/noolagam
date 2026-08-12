import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

class ChapterTile extends StatelessWidget {
  final int number;
  final String title;
  final bool isRead;
  final VoidCallback onTap;

  const ChapterTile({
    super.key,
    required this.number,
    required this.title,
    required this.onTap,
    this.isRead = false,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.grey.shade900,
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 8),

      child: ListTile(
        onTap: onTap,

        leading: CircleAvatar(
          backgroundColor: AppColors.primary,
          child: Text(
            number.toString(),
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),

        title: Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontSize: 17,
          ),
        ),

        subtitle: Text(
          isRead ? "✔ வாசிக்கப்பட்டது" : "📖 படிக்கப்படவில்லை",
          style: TextStyle(color: isRead ? Colors.green : Colors.white60),
        ),

        trailing: const Icon(
          Icons.arrow_forward_ios,
          color: Colors.white70,
          size: 18,
        ),
      ),
    );
  }
}
