// src/middleware/device.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AuthedRequest } from "../middleware/auth";

export function deviceBindingMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const rawDeviceId =
    (req.headers["x-device-id"] as string | undefined)?.trim() || null;

  // You can decide if deviceId is required or optional.
  const deviceId = rawDeviceId || `anon-${crypto.randomUUID()}`;

  req.deviceId = deviceId;

  // Watermark: any unique, traceable ID for this playback session.
  // You can log this or associate with analytics.
  const userId = req.user?.id || "anon";
  const base = `${userId}:${deviceId}:${Date.now()}:${crypto.randomUUID()}`;
  const watermarkId = crypto.createHash("sha256").update(base).digest("hex");

  req.watermarkId = watermarkId;

  // Optionally expose these via headers for debugging
  res.setHeader("X-Playback-Device-Id", deviceId);
  res.setHeader("X-Playback-Watermark-Id", watermarkId);

  return next();
}
