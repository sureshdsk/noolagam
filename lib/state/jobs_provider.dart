import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/job.dart';
import '../services/api/admin_service.dart';
import '../services/api/api_client.dart';

/// Admin jobs state: EPUB upload, job polling, admin key setting.
class JobsProvider extends ChangeNotifier {
  static const _kAdminKey = 'admin_key';
  static const _pollInterval = Duration(seconds: 2);

  JobsProvider(this._prefs, {AdminService? service, this.onCatalogChanged})
      : _service = service ?? AdminService(),
        adminKey = _prefs.getString(_kAdminKey) ?? 'dev-admin-key';

  final SharedPreferences _prefs;
  final AdminService _service;

  /// Invoked when an EPUB-ingest job completes so the catalog can refresh.
  final VoidCallback? onCatalogChanged;

  String adminKey;
  final List<Job> jobs = [];

  bool uploading = false;
  double uploadProgress = 0;
  String? uploadError;

  Timer? _timer;

  void setAdminKey(String key) {
    adminKey = key.trim();
    _prefs.setString(_kAdminKey, adminKey);
    notifyListeners();
  }

  /// Uploads an EPUB and starts polling job status.
  Future<void> uploadEpub(String filePath, {String? bookId}) async {
    if (uploading) return;
    uploading = true;
    uploadProgress = 0;
    uploadError = null;
    notifyListeners();
    try {
      final job = await _service.uploadEpub(
        filePath,
        adminKey: adminKey,
        bookId: bookId,
        onSendProgress: (count, total) {
          if (total > 0) {
            uploadProgress = count / total;
            notifyListeners();
          }
        },
      );
      jobs.insert(0, job);
      _startPolling();
    } on ApiException catch (e) {
      uploadError = e.toString();
    } catch (e) {
      uploadError = e.toString();
    }
    uploading = false;
    uploadProgress = 0;
    notifyListeners();
  }

  Future<void> loadJobs() async {
    try {
      final list = await _service.listJobs(adminKey: adminKey);
      jobs
        ..clear()
        ..addAll(list);
      if (jobs.any((j) => !j.isTerminal)) _startPolling();
      notifyListeners();
    } on ApiException {
      // Admin key may be wrong; leave list as-is. Screens surface errors on
      // explicit actions instead.
    }
  }

  void _startPolling() {
    _timer ??= Timer.periodic(_pollInterval, (_) => _poll());
  }

  Future<void> _poll() async {
    final active = jobs.where((j) => !j.isTerminal).toList();
    if (active.isEmpty) {
      _timer?.cancel();
      _timer = null;
      return;
    }
    var catalogChanged = false;
    for (final job in active) {
      try {
        final fresh = await _service.getJob(job.id, adminKey: adminKey);
        final i = jobs.indexWhere((j) => j.id == job.id);
        if (i >= 0) jobs[i] = fresh;
        if (fresh.isTerminal && fresh.type == 'process_epub' &&
            fresh.status == 'completed') {
          catalogChanged = true;
        }
      } on ApiException {
        // Transient failure; next tick retries.
      }
    }
    notifyListeners();
    if (catalogChanged) onCatalogChanged?.call();
    if (jobs.every((j) => j.isTerminal)) {
      _timer?.cancel();
      _timer = null;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
