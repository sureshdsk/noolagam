import 'package:dio/dio.dart';

class ApiService {
  ApiService._internal();

  static final ApiService _instance = ApiService._internal();

  factory ApiService() => _instance;

  /// Change this to your Flask server IP
  ///
  /// Android Emulator:
  /// http://10.0.2.2:5000
  ///
  /// Physical Phone:
  /// http://192.168.x.x:5000
  ///
  /// Windows Desktop:
  /// http://127.0.0.1:5000
  static const String baseUrl = "http://127.0.0.1:5000/api";

  late final Dio dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    ),
  );

  Future<dynamic> get(String endpoint) async {
    try {
      final response = await dio.get(endpoint);
      return response.data;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final response = await dio.post(endpoint, data: body);

      return response.data;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  Future<dynamic> put(String endpoint, Map<String, dynamic> body) async {
    try {
      final response = await dio.put(endpoint, data: body);

      return response.data;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  Future<dynamic> delete(String endpoint) async {
    try {
      final response = await dio.delete(endpoint);
      return response.data;
    } on DioException catch (e) {
      throw Exception(_handleError(e));
    }
  }

  String _handleError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        return "Connection timeout";

      case DioExceptionType.receiveTimeout:
        return "Receive timeout";

      case DioExceptionType.sendTimeout:
        return "Send timeout";

      case DioExceptionType.badResponse:
        return "Server Error (${e.response?.statusCode})";

      case DioExceptionType.connectionError:
        return "Unable to connect to server";

      case DioExceptionType.cancel:
        return "Request cancelled";

      default:
        return e.message ?? "Unknown Error";
    }
  }
}
