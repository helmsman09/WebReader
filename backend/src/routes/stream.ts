// src/routes/stream.ts
import express, { Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { deviceBindingMiddleware } from "../middleware/device";
import { rateLimitPerUserDevice } from "../middleware/rateLimit";
import { requireMediaAccess, MediaRequest } from "../middleware/mediaAccess";

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AWS_REGION } from "../config/env";

const router = express.Router();

const s3 = new S3Client({ region: AWS_REGION });

router.get(
  "/stream/:mediaId",
  authMiddleware,
  deviceBindingMiddleware,
  rateLimitPerUserDevice,
  requireMediaAccess,
  async (req: MediaRequest, res: Response) => {
    const media = req.media!;
    const userId = req.user!.id;
    const deviceId = req.deviceId!;
    const watermarkId = req.watermarkId!;

    // You can log this tuple for traceability
    console.log("STREAM_START", {
      userId,
      mediaId: media._id,
      deviceId,
      watermarkId,
      ts: new Date().toISOString(),
    });

    // Generate short-lived signed URL
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: media.bucket,
        Key: media.key,
      }),
      { expiresIn: 60 * 10 } // 10 minutes
    );

    // Attach some debugging / tracking headers (optional)
    res.setHeader("X-Stream-User-Id", userId as string);
    res.setHeader("X-Stream-Device-Id", deviceId);
    res.setHeader("X-Stream-Watermark-Id", watermarkId);

    // Redirect the player to S3
    return res.redirect(302, signedUrl);
  }
);

export default router;
