import 'package:flutter/material.dart';
import '../../home/screens/home_screen.dart';
import '../../../core/theme/app_colors.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../services/auth/auth_service.dart';
import '../../../widgets/custom_button.dart';
import '../../../widgets/custom_textfield.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool isLoading = false;
  Future<void> login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      isLoading = true;
    });

    try {
      await AuthService.login(
        email: emailController.text,
        password: passwordController.text,
      );
      print("Current User: ${FirebaseAuth.instance.currentUser?.email}");

      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );

      // TODO: Navigate to Home Screen
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Login Successful")));
    } on FirebaseAuthException catch (e) {
      String message = "Login failed";

      switch (e.code) {
        case 'user-not-found':
          message = "No user found with this email.";
          break;

        case 'wrong-password':
          message = "Incorrect password.";
          break;

        case 'invalid-email':
          message = "Invalid email address.";
          break;

        case 'invalid-credential':
          message = "Invalid email or password.";
          break;

        default:
          message = e.message ?? message;
      }

      if (!mounted) return;

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(
                    Icons.menu_book_rounded,
                    size: 95,
                    color: AppColors.primary,
                  ),

                  const SizedBox(height: 20),

                  Text(
                    "ஓலைச்சுவடி",
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      color: AppColors.button,
                      fontWeight: FontWeight.bold,
                      fontSize: 40,
                    ),
                  ),

                  const SizedBox(height: 8),

                  Text(
                    "தமிழ் இலக்கியத்தின் டிஜிட்டல் உலகம்",
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.card.withOpacity(0.75),
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),

                  const SizedBox(height: 40),

                  Card(
                    color: AppColors.card,
                    elevation: 8,
                    shadowColor: Colors.black26,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          children: [
                            const Text(
                              "Welcome Back",
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),

                            const SizedBox(height: 25),

                            CustomTextField(
                              hintText: "Email",
                              prefixIcon: Icons.email_outlined,
                              controller: emailController,
                              keyboardType: TextInputType.emailAddress,
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return "Enter your email";
                                }

                                if (!value.contains("@")) {
                                  return "Invalid email";
                                }

                                return null;
                              },
                            ),

                            const SizedBox(height: 20),

                            CustomTextField(
                              hintText: "Password",
                              prefixIcon: Icons.lock_outline,
                              controller: passwordController,
                              obscureText: true,
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return "Enter your password";
                                }

                                if (value.length < 6) {
                                  return "Minimum 6 characters";
                                }

                                return null;
                              },
                            ),

                            const SizedBox(height: 25),

                            CustomButton(
                              text: isLoading ? "Logging in..." : "Login",
                              onPressed: isLoading ? null : login,
                            ),

                            const SizedBox(height: 15),

                            TextButton(
                              onPressed: () {},
                              child: const Text("Forgot Password?"),
                            ),

                            const Divider(height: 35),

                            OutlinedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.account_circle),
                              label: const Text("Continue with Google"),
                            ),

                            const SizedBox(height: 20),

                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text("New here?"),
                                TextButton(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => const RegisterScreen(),
                                      ),
                                    );
                                  },
                                  child: const Text("Create Account"),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
