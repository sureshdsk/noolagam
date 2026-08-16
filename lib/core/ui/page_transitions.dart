import 'package:flutter/material.dart';

/// Material-style fade-through page transition for detail pushes.
class FadeThroughRoute<T> extends PageRouteBuilder<T> {
  final WidgetBuilder builder;

  FadeThroughRoute({required this.builder, super.settings})
      : super(
          transitionDuration: const Duration(milliseconds: 380),
          reverseTransitionDuration: const Duration(milliseconds: 260),
          pageBuilder: (context, animation, secondary) => builder(context),
          transitionsBuilder: (context, animation, secondary, child) {
            final curved = CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
              reverseCurve: Curves.easeInCubic,
            );
            return FadeTransition(
              opacity: Tween(begin: 0.0, end: 1.0).animate(curved),
              child: SlideTransition(
                position: Tween(begin: const Offset(0, 0.02), end: Offset.zero)
                    .animate(curved),
                child: child,
              ),
            );
          },
        );
}

/// Rising sheet transition for the immersive reader.
class RiseRoute<T> extends PageRouteBuilder<T> {
  final WidgetBuilder builder;

  RiseRoute({required this.builder, super.settings})
      : super(
          transitionDuration: const Duration(milliseconds: 420),
          reverseTransitionDuration: const Duration(milliseconds: 300),
          opaque: false,
          pageBuilder: (context, animation, secondary) => builder(context),
          transitionsBuilder: (context, animation, secondary, child) {
            final curved = CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
              reverseCurve: Curves.easeInCubic,
            );
            return FadeTransition(
              opacity: Tween(begin: 0.0, end: 1.0).animate(curved),
              child: SlideTransition(
                position: Tween(begin: const Offset(0, 0.05), end: Offset.zero)
                    .animate(curved),
                child: child,
              ),
            );
          },
        );
}
