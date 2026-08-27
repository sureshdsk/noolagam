/// Authentication seam so a real provider (e.g. Clerk) can replace the
/// no-auth dev setup without touching the API layer.
///
/// The backend verifies RS256 JWTs against a JWKS endpoint when
/// AUTH_ENFORCE=true. While it is false (local dev), requests need no token.
abstract class AuthService {
  /// Bearer token to attach to content requests, or null when unauthenticated.
  Future<String?> get bearerToken;
}

class NoopAuthService implements AuthService {
  @override
  Future<String?> get bearerToken async => null;
}
