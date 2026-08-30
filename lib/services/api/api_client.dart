import 'package:dio/dio.dart';

import '../../core/config.dart';
import '../auth/auth_service.dart';

/// RFC 7807 problem+json error returned by the Noolagam API.
class ApiException implements Exception {
  final int? status;
  final String type;
  final String title;
  final String? detail;

  const ApiException({
    this.status,
    required this.type,
    required this.title,
    this.detail,
  });

  factory ApiException.fromDio(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      return ApiException(
        status: e.response?.statusCode,
        type: data['type']?.toString() ?? 'unknown',
        title: data['title']?.toString() ?? 'Request failed',
        detail: data['detail']?.toString(),
      );
    }
    return ApiException(
      status: e.response?.statusCode,
      type: 'network_error',
      title: _networkMessage(e),
    );
  }

  static String _networkMessage(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'இணைப்பில் தாமதம் — மீண்டும் முயற்சிக்கவும்';
      case DioExceptionType.connectionError:
        return 'சேவையகத்தை அடைய முடியவில்லை. பின்னணி (wrangler dev) இயங்குகிறதா என்று பார்க்கவும்';
      case DioExceptionType.cancel:
        return 'கோரிக்கை ரத்து செய்யப்பட்டது';
      default:
        return 'சேவையகப் பிழை (${e.response?.statusCode ?? e.type.name})';
    }
  }

  bool get isNotFound => status == 404 || type == 'not_found' || type.endsWith('_not_found');

  @override
  String toString() => detail ?? title;
}

/// Thin wrapper around Dio for the `/v1` API with optional bearer auth.
class ApiClient {
  ApiClient({AuthService? authService})
      : _authService = authService ?? NoopAuthService();

  final AuthService _authService;

  final Dio dio = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {'Accept': 'application/json'},
    ),
  );

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, dynamic>? query,
    bool authenticated = false,
    Map<String, String> extraHeaders = const {},
  }) async {
    try {
      final res = await dio.get(
        path,
        queryParameters: query,
        options: await _options(authenticated, extraHeaders),
      );
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, dynamic> data, {
    bool authenticated = false,
    Map<String, String> extraHeaders = const {},
  }) async {
    try {
      final res = await dio.post(
        path,
        data: data,
        options: await _options(authenticated, extraHeaders),
      );
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Map<String, dynamic>> postForm(
    String path,
    FormData form, {
    Map<String, String> extraHeaders = const {},
    void Function(int count, int total)? onSendProgress,
  }) async {
    try {
      final res = await dio.post(
        path,
        data: form,
        options: Options(headers: extraHeaders),
        onSendProgress: onSendProgress,
      );
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// Fetches a bare URL (e.g. a presigned object URL) with no base/auth.
  Future<Map<String, dynamic>> getAbsoluteJson(String url) async {
    try {
      final res = await dio.get(url);
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<Options?> _options(
    bool authenticated,
    Map<String, String> extraHeaders,
  ) async {
    final headers = Map<String, String>.from(extraHeaders);
    if (authenticated) {
      final token = await _authService.bearerToken;
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    if (headers.isEmpty) return null;
    return Options(headers: headers);
  }
}
