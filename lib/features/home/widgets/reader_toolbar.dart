import 'package:flutter/material.dart';

import '../../../core/theme/reader_palette.dart';

/// Floating reader control bar: font size, reading theme, and an
/// iBooks-style chapter scrubber to jump anywhere in the book.
class ReaderToolbar extends StatelessWidget {
  final ReaderPalette palette;
  final ReaderThemeMode themeMode;
  final double fontSize;
  final int position;
  final int totalChapters;
  final int? previewPosition;
  final VoidCallback onDecreaseFont;
  final VoidCallback onIncreaseFont;
  final VoidCallback onCycleTheme;
  final ValueChanged<double> onScrubPreview;
  final ValueChanged<double> onScrubCommit;

  const ReaderToolbar({
    super.key,
    required this.palette,
    required this.themeMode,
    required this.fontSize,
    required this.position,
    required this.totalChapters,
    required this.onDecreaseFont,
    required this.onIncreaseFont,
    required this.onCycleTheme,
    required this.onScrubPreview,
    required this.onScrubCommit,
    this.previewPosition,
  });

  @override
  Widget build(BuildContext context) {
    final shown = previewPosition ?? position;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 14),
      padding: const EdgeInsets.fromLTRB(6, 6, 10, 0),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: themeMode.isDark ? 0.4 : 0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              _iconButton(
                icon: Icons.text_decrease_rounded,
                tooltip: "எழுத்து அளவு குறை",
                onPressed: onDecreaseFont,
              ),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: SizedBox(
                  key: ValueKey(fontSize.toInt()),
                  width: 30,
                  child: Text(
                    fontSize.toInt().toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.text,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              _iconButton(
                icon: Icons.text_increase_rounded,
                tooltip: "எழுத்து அளவு கூட்டு",
                onPressed: onIncreaseFont,
              ),
              _divider(),
              Expanded(
                child: Align(
                  alignment: Alignment.centerRight,
                  child: GestureDetector(
                    onTap: onCycleTheme,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeOutCubic,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 11,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: palette.accent.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 250),
                            transitionBuilder: (child, animation) =>
                                ScaleTransition(scale: animation, child: child),
                            child: Icon(
                              themeMode.icon,
                              key: ValueKey(themeMode),
                              size: 16,
                              color: palette.accent,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            themeMode.label,
                            style: TextStyle(
                              color: palette.secondary,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (totalChapters > 1)
            Row(
              children: [
                SizedBox(
                  width: 38,
                  child: Text(
                    '$shown',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.accent,
                      fontWeight: FontWeight.bold,
                      fontSize: 12.5,
                    ),
                  ),
                ),
                Expanded(
                  child: SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      trackHeight: 4,
                      thumbShape: const RoundSliderThumbShape(
                        enabledThumbRadius: 7,
                      ),
                      overlayShape: const RoundSliderOverlayShape(
                        overlayRadius: 16,
                      ),
                    ),
                    child: Slider(
                      value: shown.toDouble(),
                      min: 1,
                      max: totalChapters.toDouble(),
                      divisions: totalChapters - 1,
                      activeColor: palette.accent,
                      inactiveColor: palette.secondary.withValues(alpha: 0.3),
                      label: 'அத்தியாயம் $shown',
                      onChanged: onScrubPreview,
                      onChangeEnd: onScrubCommit,
                    ),
                  ),
                ),
                SizedBox(
                  width: 38,
                  child: Text(
                    '$totalChapters',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: palette.secondary,
                      fontWeight: FontWeight.w600,
                      fontSize: 12.5,
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _divider() {
    return Container(
      width: 1,
      height: 22,
      margin: const EdgeInsets.symmetric(horizontal: 5),
      color: palette.secondary.withValues(alpha: 0.25),
    );
  }

  Widget _iconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback? onPressed,
  }) {
    final enabled = onPressed != null;
    return IconButton(
      onPressed: onPressed,
      tooltip: tooltip,
      icon: Icon(icon),
      iconSize: 20,
      color: enabled ? palette.text : palette.secondary.withValues(alpha: 0.35),
      visualDensity: VisualDensity.compact,
      constraints: const BoxConstraints(minWidth: 38, minHeight: 38),
      padding: const EdgeInsets.symmetric(horizontal: 4),
    );
  }
}
