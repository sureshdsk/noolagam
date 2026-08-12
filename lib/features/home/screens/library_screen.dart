import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import 'book_details_screen.dart';

class LibraryScreen extends StatelessWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final books = [
      {
        "title": "திருக்குறள்",
        "author": "திருவள்ளுவர்",
        "summary":
            "திருக்குறள் உலகப் புகழ்பெற்ற தமிழ் அறநூலாகும். இதில் 1330 குறள்கள் உள்ளன."
      },
      {
        "title": "சிலப்பதிகாரம்",
        "author": "இளங்கோ அடிகள்",
        "summary":
            "தமிழின் ஐம்பெரும் காப்பியங்களில் ஒன்று."
      },
      {
        "title": "பொன்னியின் செல்வன்",
        "author": "கல்கி",
        "summary":
            "சோழர் வரலாற்றை மையமாகக் கொண்ட வரலாற்று நாவல்."
      },
    ];

    return Scaffold(
      backgroundColor: AppColors.background,

      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text(
          "என் நூலகம்",
          style: TextStyle(color: Colors.white),
        ),
      ),

      body: ListView.builder(
        itemCount: books.length,

        itemBuilder: (context, index) {
          final book = books[index];

          return Card(
            color: Colors.grey.shade900,
            margin: const EdgeInsets.all(12),

            child: ListTile(
              leading: const Icon(
                Icons.menu_book,
                color: Colors.white,
              ),

              title: Text(
                book["title"]!,
                style: const TextStyle(color: Colors.white),
              ),

              subtitle: Text(
                book["author"]!,
                style: const TextStyle(color: Colors.white70),
              ),

              trailing: const Icon(
                Icons.arrow_forward_ios,
                color: Colors.white,
              ),

              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => BookDetailsScreen(
                      title: book["title"]!,
                      author: book["author"]!,
                      summary: book["summary"]!,
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}