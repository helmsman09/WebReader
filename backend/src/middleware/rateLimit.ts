// src/middleware/rateLimit.ts
import { Request, Response, NextFunction } from "express";
import { AuthedRequest } from "../middleware/auth";
interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory store: { "userId:deviceId": Bucket }
const buckets = new Map<string, Bucket>();

// Config
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // e.g., 30 stream requests/min

export function rateLimitPerUserDevice(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.id || "anon";
  const deviceId = req.deviceId || "unknown-device";

  const key = `${userId}:${deviceId}`;
  const now = Date.now();

  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = {
      count: 0,
      resetAt: now + WINDOW_MS,
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - bucket.count);

  // Expose rate-limit headers (optional but handy)
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_WINDOW.toString());
  res.setHeader("X-RateLimit-Remaining", remaining.toString());
  res.setHeader("X-RateLimit-Reset", bucket.resetAt.toString());

  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: "Too many requests",
      hint: "Rate limit is per user+device",
    });
  }

  return next();
}
