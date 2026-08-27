import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/ui/page_transitions.dart';
import '../home/screens/home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1500),
  )..forward();

  @override
  void initState() {
    super.initState();
    Timer(const Duration(milliseconds: 1750), _goHome);
  }

  void _goHome() {
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      FadeThroughRoute(builder: (_) => const HomeScreen()),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Animation<double> _interval(double begin, double end) {
    return CurvedAnimation(
      parent: _controller,
      curve: Interval(begin, end, curve: Curves.easeOutCubic),
    );
  }

  @override
  Widget build(BuildContext context) {
    final logoScale = Tween(begin: 0.5, end: 1.0)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutBack));
    final ringScale = Tween(begin: 0.8, end: 1.35).animate(_interval(0, 0.6));
    final ringOpacity = Tween(begin: 0.5, end: 0.0).animate(_interval(0, 0.6));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 30),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  alignment: Alignment.center,
                  children: [
                    ScaleTransition(
                      scale: ringScale,
                      child: FadeTransition(
                        opacity: ringOpacity,
                        child: Container(
                          height: 168,
                          width: 168,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.45),
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                    ScaleTransition(
                      scale: logoScale,
                      child: FadeTransition(
                        opacity: _interval(0, 0.35),
                        child: Container(
                          height: 132,
                          width: 132,
                          decoration: BoxDecoration(
                            gradient: AppColors.emberGradient,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.35),
                                blurRadius: 40,
                                offset: const Offset(0, 16),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.menu_book_rounded,
                            size: 62,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 36),
                FadeSlideTransition(
                  animation: _interval(0.15, 0.45),
                  child: const Text(
                    "ஓலைச்சுவடி",
                    style: TextStyle(
                      fontSize: 38,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                      letterSpacing: 1,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                FadeSlideTransition(
                  animation: _interval(0.25, 0.55),
                  child: const Text(
                    "தமிழ் இலக்கியத்தின் டிஜிட்டல் உலகம்",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 17,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(height: 42),
                FadeSlideTransition(
                  animation: _interval(0.35, 0.65),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(3, (i) {
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 5),
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: AppColors.accent,
                          shape: BoxShape.circle,
                        ),
                      );
                    }),
                  ),
                ),
                const SizedBox(height: 26),
                FadeSlideTransition(
                  animation: _interval(0.45, 0.8),
                  child: const Text(
                    "யாதும் ஊரே\nயாவரும் கேளிர்",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      height: 1.6,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 54),
                FadeTransition(
                  opacity: _interval(0.3, 0.5),
                  child: AnimatedBuilder(
                    animation: _controller,
                    builder: (context, _) {
                      return Container(
                        width: 130,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.secondary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        clipBehavior: Clip.antiAlias,
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor:
                              Curves.easeOutCubic.transform(_controller.value),
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: AppColors.emberGradient,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class FadeSlideTransition extends StatelessWidget {
  final Animation<double> animation;
  final Widget child;

  const FadeSlideTransition({
    super.key,
    required this.animation,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: animation,
      child: SlideTransition(
        position: Tween(begin: const Offset(0, 0.05), end: Offset.zero)
            .animate(animation),
        child: child,
      ),
    );
  }
}
