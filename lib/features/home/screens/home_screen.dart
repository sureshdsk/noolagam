import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../authentication/screens/login_screen.dart';
import '../widgets/greeting_header.dart';
import '../widgets/quote_card.dart';
import '../widgets/book_card.dart';
import '../widgets/continue_reading.dart';
import '../widgets/featured_books.dart';
import '../widgets/category_section.dart';
import '../widgets/bottom_navbar.dart';
import '../screens/book_details_screen.dart';
import '../widgets/section_title.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int selectedIndex = 0;
  final List<Map<String, dynamic>> featuredBooks = [
    {"title": "திருக்குறள்", "author": "திருவள்ளுவர்", "rating": 4.9},
    {"title": "சிலப்பதிகாரம்", "author": "இளங்கோ அடிகள்", "rating": 4.8},
    {"title": "பொன்னியின் செல்வன்", "author": "கல்கி", "rating": 4.9},
    {"title": "மணிமேகலை", "author": "சாத்தனார்", "rating": 4.7},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,

      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          "ஓலைச்சுவடி",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),

        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline, color: Colors.white),
            onPressed: () {},
          ),

          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: () async {
              await FirebaseAuth.instance.signOut();

              if (!context.mounted) return;

              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              );
            },
          ),
        ],
      ),

      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const GreetingHeader(),

              const SizedBox(height: 30),

              const QuoteCard(),

              const SizedBox(height: 35),

              ContinueReading(
                title: "திருக்குறள்",
                author: "திருவள்ளுவர்",
                progress: .62,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => BookDetailsScreen(
                        title: "திருக்குறள்",
                        author: "திருவள்ளுவர்",
                        summary:
                            "திருக்குறள் என்பது உலகப் புகழ்பெற்ற தமிழ் அறநூல்.",
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 35),

              const SectionTitle(title: "📖 தொடர்ந்து படிக்க"),

              const SizedBox(height: 15),

              SizedBox(
                height: 250,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => BookDetailsScreen(
                              title: "திருக்குறள்",
                              author: "திருவள்ளுவர்",
                              summary:
                                  "திருக்குறள் என்பது உலகப் புகழ்பெற்ற தமிழ் அறநூல். இதில் 1330 குறள்கள் உள்ளன. அறம், பொருள் மற்றும் இன்பம் ஆகிய மூன்று பகுதிகளாக அமைந்துள்ளது.",
                            ),
                          ),
                        );
                      },
                      child: BookCard(
                        title: "திருக்குறள்",
                        author: "திருவள்ளுவர்",
                      ),
                    ),

                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => BookDetailsScreen(
                              title: "சிலப்பதிகாரம்",
                              author: "இளங்கோ அடிகள்",
                              summary:
                                  "சிலப்பதிகாரம் தமிழின் ஐம்பெரும் காப்பியங்களில் ஒன்றாகும். கோவலன் மற்றும் கண்ணகியின் வாழ்க்கையை மையமாகக் கொண்டு அமைந்துள்ளது.",
                            ),
                          ),
                        );
                      },
                      child: BookCard(
                        title: "சிலப்பதிகாரம்",
                        author: "இளங்கோ அடிகள்",
                      ),
                    ),

                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => BookDetailsScreen(
                              title: "பொன்னியின் செல்வன்",
                              author: "கல்கி",
                              summary:
                                  "பொன்னியின் செல்வன் சோழர் பேரரசை மையமாகக் கொண்ட வரலாற்று நாவல். கல்கி எழுதிய மிகவும் புகழ்பெற்ற தமிழ் இலக்கியங்களில் இதுவும் ஒன்றாகும்.",
                            ),
                          ),
                        );
                      },
                      child: BookCard(
                        title: "பொன்னியின் செல்வன்",
                        author: "கல்கி",
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 35),

              const SectionTitle(title: "⭐ பரிந்துரைக்கப்பட்ட நூல்கள்"),

              const SizedBox(height: 15),

              FeaturedBooks(
                books: featuredBooks,
                onBookTap: (book) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => BookDetailsScreen(
                        title: book["title"],
                        author: book["author"],
                        summary:
                            "இந்த நூலின் சுருக்கம் பின்னர் API மூலம் வரும்.",
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 35),

              const SectionTitle(title: "📂 வகைகள்"),

              const SizedBox(height: 15),

              CategorySection(
                onCategoryTap: (category) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text("$category தேர்ந்தெடுக்கப்பட்டது")),
                  );
                },
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: BottomNavbar(
        currentIndex: selectedIndex,
        onTap: (index) {
          setState(() {
            selectedIndex = index;
          });

          // Navigation can be added later
        },
      ),
    );
  }
}
