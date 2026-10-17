const buckets = new Map<string, { count: number; resetAt: number }>();

interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  cleanup(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

export function resetAllRateLimits(): void {
  buckets.clear();
}

let ops = 0;
function cleanup(now: number): void {
  if (++ops % 200 !== 0) return;
  buckets.forEach((b, k) => {
    if (b.resetAt <= now) buckets.delete(k);
  });
}
