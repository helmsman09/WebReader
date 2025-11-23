import type { Request, Response, NextFunction } from "express";
import { User } from "../models/User";

export interface AuthedRequest extends Request {
  user?: typeof User.prototype;
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

    const user = await User.findOne({ apiKey: token }).exec();
    if (!user) {
      return res.status(401).send("Invalid API key");
    }

    req.user = user;
    next();
  } catch (e) {
    console.error(e);
    res.status(500).send("Auth error");
  }
}
