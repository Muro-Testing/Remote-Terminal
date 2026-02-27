export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  allow(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const threshold = now - windowMs;
    const current = this.buckets.get(key) ?? [];
    const next = current.filter((timestamp) => timestamp > threshold);

    if (next.length >= limit) {
      this.buckets.set(key, next);
      return false;
    }

    next.push(now);
    this.buckets.set(key, next);
    return true;
  }
}
