// backend/src/middleware/requireUser.ts
import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  user?: { _id: string }; // adapt to your actual user type
}

export function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
