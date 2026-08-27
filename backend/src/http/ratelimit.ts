interface Bucket {
  windowStart: number;
  count: number;
}

const WINDOW_MS = 60_000;

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = WINDOW_MS,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      this.buckets.set(key, { windowStart: now, count: 1 });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= this.limit;
  }
}
