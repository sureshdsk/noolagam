import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import 'home_tab.dart';
import 'library_screen.dart';
import 'profile_screen.dart';
import 'search_screen.dart';
import '../widgets/bottom_navbar.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  int selectedIndex = 0;

  late final AnimationController _fade = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 320),
  )..value = 1;

  void _onTap(int index) {
    if (index == selectedIndex) return;
    setState(() => selectedIndex = index);
    _fade.forward(from: 0);
  }

  @override
  void dispose() {
    _fade.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: FadeTransition(
          opacity: CurvedAnimation(
            parent: _fade,
            curve: const Interval(0.35, 1, curve: Curves.easeOut),
          ),
          child: SlideTransition(
            position: Tween(begin: const Offset(0, 0.012), end: Offset.zero)
                .animate(
              CurvedAnimation(parent: _fade, curve: Curves.easeOutCubic),
            ),
            child: IndexedStack(
              index: selectedIndex,
              children: const [
                HomeTab(),
                SearchScreen(),
                LibraryScreen(),
                ProfileScreen(),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: BottomNavbar(
        currentIndex: selectedIndex,
        onTap: _onTap,
      ),
    );
  }
}
