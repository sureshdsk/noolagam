import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import '../../models/job.dart';
import 'api_client.dart';

/// Client for admin-only `/v1/jobs` endpoints (X-Admin-Key protected).
class AdminService {
  AdminService({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  /// Uploads an EPUB for ingestion. Returns the created job (status pending).
  Future<Job> uploadEpub(
    String filePath, {
    required String adminKey,
    String? bookId,
    void Function(int count, int total)? onSendProgress,
  }) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        // Platform.pathSeparator is unavailable on web; uploaded paths
        // there always use '/' separators anyway.
        filename: filePath
            .split(kIsWeb ? '/' : Platform.pathSeparator)
            .last,
      ),
      if (bookId != null && bookId.isNotEmpty) 'bookId': bookId,
    });
    final json = await _client.postForm(
      '/jobs',
      form,
      extraHeaders: {'X-Admin-Key': adminKey},
      onSendProgress: onSendProgress,
    );
    return Job.fromJson(json);
  }

  Future<Job> getJob(String id, {required String adminKey}) async {
    final json = await _client.getJson(
      '/jobs/$id',
      extraHeaders: {'X-Admin-Key': adminKey},
    );
    return Job.fromJson(json);
  }

  Future<List<Job>> listJobs({required String adminKey}) async {
    final json = await _client.getJson(
      '/jobs',
      extraHeaders: {'X-Admin-Key': adminKey},
    );
    return (json['items'] as List<dynamic>)
        .map((e) => Job.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
