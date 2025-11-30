import type { Request, Response, NextFunction } from "express";
import { User, type IUser } from "../models/User";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";

export interface AuthedRequest extends Request {
  user?: IUser;         // root user
  authDevice?: IUser;   // device user row
  deviceId?: string;
  watermarkId?: string;
}

export async function apiKeyAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const auth = req.headers.authorization || "";
    const [scheme, token] = auth.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).send("Missing or invalid Authorization header");
    }

    const deviceUser = await User.findOne({ apiKey: token }).exec();
    if (!deviceUser) {
      return res.status(401).send("Invalid API key");
    }

    if (deviceUser.isRevoked) {
      return res.status(401).send("This device has been revoked.");
    }

    let rootUser: IUser | null = deviceUser;
    if (deviceUser.upgradeParentUserId) {
      rootUser = await User.findById(deviceUser.upgradeParentUserId).exec();
      if (!rootUser) {
        // Parent missing — treat device as root
        rootUser = deviceUser;
      }
    }

    // Track last seen for this device
    deviceUser.lastSeenAt = new Date();
    await deviceUser.save().catch(() => {});

    req.authDevice = deviceUser;
    req.user = rootUser;
    next();
  } catch (e) {
    console.error(e);
    res.status(500).send("Auth error");
  }
}

export function authMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization" });
  }

  const token = auth.slice("Bearer ".length).trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      email?: string;
      [key: string]: any;
    };

    // Normalize into req.user: TO-DO
    /*
    req.user = {
      id: decoded.sub,
      email: decoded.email,
    };*/

    return next();
  } catch (err) {
    console.error("JWT verification failed", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}