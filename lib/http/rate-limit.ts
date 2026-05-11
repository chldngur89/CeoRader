type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function prune(now: number) {
  if (store.size < 2000) return;
  store.forEach((bucket, key) => {
    if (now > bucket.resetAt) store.delete(key);
  });
}

const disable = () => process.env.DISABLE_API_RATE_LIMIT === "true";

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (disable()) return { ok: true };
  const now = Date.now();
  prune(now);
  const bucket = store.get(key);
  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count++;
  return { ok: true };
}

export function analyzeLimitPerMinute() {
  const n = Number(process.env.API_RATE_LIMIT_ANALYZE_PER_MINUTE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

export function pricingLimitPerMinute() {
  const n = Number(process.env.API_RATE_LIMIT_PRICING_PER_MINUTE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60;
}
