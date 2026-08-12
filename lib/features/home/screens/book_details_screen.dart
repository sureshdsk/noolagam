import 'package:flutter/material.dart';
import 'reader_screen.dart';
import 'chapter_list_screen.dart';

import '../../../core/theme/app_colors.dart';

class BookDetailsScreen extends StatelessWidget {
  final String title;
  final String author;
  final String summary;

  const BookDetailsScreen({
    super.key,
    required this.title,
    required this.author,
    required this.summary,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,

      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(title, style: const TextStyle(color: Colors.white)),
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),

        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,

          children: [
            Center(
              child: Container(
                width: 180,
                height: 250,
                decoration: BoxDecoration(
                  color: Colors.grey.shade900,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(
                  Icons.menu_book_rounded,
                  size: 80,
                  color: Colors.white70,
                ),
              ),
            ),

            const SizedBox(height: 25),

            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              author,
              style: const TextStyle(color: Colors.white70, fontSize: 18),
            ),

            const SizedBox(height: 30),

            const Text(
              "Summary",
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            Text(
              summary,
              style: const TextStyle(
                color: Colors.white70,
                height: 1.6,
                fontSize: 16,
              ),
            ),

            const SizedBox(height: 35),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.menu_book),
                label: const Text("படிக்க தொடங்கு"),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ChapterListScreen(bookTitle: title),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 12),

            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  // Add to Library later
                },
                child: const Text("Add to Library"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
