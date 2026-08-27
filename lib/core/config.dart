import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Resolves the API base URL for the Noolagam `/v1` REST backend.
///
/// Override at build/run time with:
///   flutter run --dart-define=API_BASE_URL=http://192.168.x.x:8787/v1
class ApiConfig {
  ApiConfig._();

  static const _override = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (kIsWeb) return 'http://localhost:8787/v1';
    // Android emulator reaches the host machine via 10.0.2.2.
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8787/v1';
    }
    return 'http://localhost:8787/v1';
  }

  /// Anonymous cover endpoint (302-redirects to a presigned object URL).
  static String coverUrl(String bookId) => '$baseUrl/books/$bookId/cover';
}
