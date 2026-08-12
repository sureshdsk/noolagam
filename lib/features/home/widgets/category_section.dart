import 'package:flutter/material.dart';

import 'category_chip.dart';

class CategorySection extends StatelessWidget {
  final Function(String category) onCategoryTap;

  const CategorySection({super.key, required this.onCategoryTap});

  @override
  Widget build(BuildContext context) {
    final categories = [
      {"icon": Icons.account_balance, "title": "சங்க இலக்கியம்"},
      {"icon": Icons.auto_stories, "title": "நாவல்கள்"},
      {"icon": Icons.temple_hindu, "title": "பக்தி"},
      {"icon": Icons.school, "title": "கல்வி"},
      {"icon": Icons.history_edu, "title": "வரலாறு"},
      {"icon": Icons.psychology, "title": "தத்துவம்"},
    ];

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: categories.map((category) {
        return CategoryChip(
          icon: category["icon"] as IconData,
          title: category["title"] as String,
          onTap: () => onCategoryTap(category["title"] as String),
        );
      }).toList(),
    );
  }
}
