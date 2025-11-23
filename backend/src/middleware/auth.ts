import type { Request, Response, NextFunction } from "express";
import { User, type IUser } from "../models/User";

export interface AuthedRequest extends Request {
  user?: IUser;         // root user
  authDevice?: IUser;   // device user row
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
