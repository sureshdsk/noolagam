import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

class BottomNavbar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BottomNavbar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onTap,
      type: BottomNavigationBarType.fixed,
      backgroundColor: AppColors.background,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: Colors.white60,
      elevation: 8,

      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.home_rounded),
          label: "முகப்பு",
        ),

        BottomNavigationBarItem(
          icon: Icon(Icons.search_rounded),
          label: "தேடல்",
        ),

        BottomNavigationBarItem(
          icon: Icon(Icons.library_books_rounded),
          label: "நூலகம்",
        ),

        BottomNavigationBarItem(
          icon: Icon(Icons.person_rounded),
          label: "சுயவிவரம்",
        ),
      ],
    );
  }
}
