import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../models/chapter.dart';
import '../widgets/chapter_tile.dart';
import 'reader_screen.dart';

class ChapterListScreen extends StatelessWidget {
  final String bookTitle;

  const ChapterListScreen({super.key, required this.bookTitle});

  @override
  Widget build(BuildContext context) {
    final List<Chapter> chapters = List.generate(
      20,
      (index) => Chapter(
        id: (index + 1).toString(),
        bookId: "demo_book",
        chapterNumber: index + 1,
        title: "அத்தியாயம் ${index + 1}",
        content:
            "இது '$bookTitle' நூலின் ${index + 1} ஆம் அத்தியாயத்தின் மாதிரி உள்ளடக்கம்.\n\n"
            "பின்னர் Flask API-யிலிருந்து இந்த உள்ளடக்கம் தானாக ஏற்றப்படும்.",
        readingTime: 5,
        isBookmarked: false,
        isCompleted: false,
        audioAvailable: false,
        audioUrl: "",
      ),
    );

    return Scaffold(
      backgroundColor: AppColors.background,

      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        centerTitle: true,
        title: Text(
          bookTitle,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),

      body: Column(
        children: [
          const SizedBox(height: 20),

          const Text(
            "அத்தியாயங்கள்",
            style: TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 5),

          Text(
            "${chapters.length} அத்தியாயங்கள்",
            style: const TextStyle(color: Colors.white70, fontSize: 16),
          ),

          const SizedBox(height: 20),

          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: chapters.length,
              itemBuilder: (context, index) {
                final chapter = chapters[index];

                return ChapterTile(
                  number: chapter.chapterNumber,
                  title: chapter.title,
                  isRead: chapter.isCompleted,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ReaderScreen(
                          bookTitle: bookTitle,
                          chapter: chapter,
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
