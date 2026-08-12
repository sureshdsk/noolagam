import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../models/chapter.dart';
import '../widgets/reader_toolbar.dart';
import '../widgets/tts_controls.dart';

class ReaderScreen extends StatefulWidget {
  final String bookTitle;
  final Chapter chapter;

  const ReaderScreen({
    super.key,
    required this.bookTitle,
    required this.chapter,
  });

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  double fontSize = 20;

  bool darkMode = true;

  bool bookmarked = false;

  double speechSpeed = 1.0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: darkMode ? AppColors.background : Colors.white,

      appBar: AppBar(
        backgroundColor: darkMode ? AppColors.background : Colors.white,

        elevation: 0,

        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.bookTitle,
              style: TextStyle(
                color: darkMode ? Colors.white : Colors.black,
                fontWeight: FontWeight.bold,
              ),
            ),

            Text(
              widget.chapter.title,
              style: TextStyle(
                color: darkMode ? Colors.white70 : Colors.black54,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),

      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),

              child: SelectableText(
                widget.chapter.content,

                style: TextStyle(
                  fontSize: fontSize,
                  height: 1.9,
                  color: darkMode ? Colors.white : Colors.black,
                ),
              ),
            ),
          ),

          ReaderToolbar(
            fontSize: fontSize,

            darkMode: darkMode,

            increaseFont: () {
              setState(() {
                fontSize++;
              });
            },

            decreaseFont: () {
              setState(() {
                if (fontSize > 16) {
                  fontSize--;
                }
              });
            },

            toggleTheme: () {
              setState(() {
                darkMode = !darkMode;
              });
            },

            bookmark: () {
              setState(() {
                bookmarked = !bookmarked;
              });

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    bookmarked
                        ? "புத்தகக்குறி சேர்க்கப்பட்டது"
                        : "புத்தகக்குறி நீக்கப்பட்டது",
                  ),
                ),
              );
            },
          ),

          TtsControls(
            speed: speechSpeed,

            onSpeedChanged: (value) {
              setState(() {
                speechSpeed = value;
              });
            },

            play: () {
              print("Play ${widget.chapter.title}");
            },

            pause: () {
              print("Pause");
            },

            resume: () {
              print("Resume");
            },

            stop: () {
              print("Stop");
            },
          ),
        ],
      ),

      bottomNavigationBar: BottomAppBar(
        color: darkMode ? Colors.grey.shade900 : Colors.grey.shade300,

        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),

          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,

            children: [
              TextButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                },

                icon: const Icon(Icons.arrow_back),

                label: const Text("முந்தைய"),
              ),

              TextButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("அடுத்த அத்தியாயம்")),
                  );
                },

                icon: const Icon(Icons.arrow_forward),

                label: const Text("அடுத்து"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
