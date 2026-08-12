import 'package:flutter/material.dart';

class ReaderToolbar extends StatelessWidget {
  final double fontSize;
  final VoidCallback increaseFont;
  final VoidCallback decreaseFont;
  final VoidCallback toggleTheme;
  final VoidCallback bookmark;
  final bool darkMode;

  const ReaderToolbar({
    super.key,
    required this.fontSize,
    required this.increaseFont,
    required this.decreaseFont,
    required this.toggleTheme,
    required this.bookmark,
    required this.darkMode,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
      decoration: BoxDecoration(
        color: darkMode ? Colors.grey.shade900 : Colors.grey.shade200,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          IconButton(
            onPressed: decreaseFont,
            icon: const Icon(Icons.text_decrease),
          ),

          Text(
            fontSize.toInt().toString(),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),

          IconButton(
            onPressed: increaseFont,
            icon: const Icon(Icons.text_increase),
          ),

          IconButton(
            onPressed: toggleTheme,
            icon: Icon(darkMode ? Icons.light_mode : Icons.dark_mode),
          ),

          IconButton(
            onPressed: bookmark,
            icon: const Icon(Icons.bookmark_border),
          ),
        ],
      ),
    );
  }
}
