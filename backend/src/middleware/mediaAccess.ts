// src/middleware/mediaAccess.ts
import { Request, Response, NextFunction } from "express";
import { findMediaById, userCanAccessMedia, MediaRecord } from "../models/media";
import { AuthedRequest } from "../middleware/auth";

export interface MediaRequest extends AuthedRequest {
  media?: MediaRecord;
}

export async function requireMediaAccess(
  req: MediaRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.id;
  const mediaId = req.params.mediaId || req.params.id; // support both

  if (!userId) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  if (!mediaId) {
    return res.status(400).json({ error: "Missing media id" });
  }

  const media = await findMediaById(mediaId);

  if (!media) {
    return res.status(404).json({ error: "Media not found" });
  }

  const allowed = await userCanAccessMedia(userId, media);

  if (!allowed) {
    return res.status(403).json({ error: "No access to this media" });
  }

  // Attach to request for downstream handler
  req.media = media;

  return next();
}
