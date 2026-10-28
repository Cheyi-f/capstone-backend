
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/config.js";

export interface AuthenticatedRequest {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequest;
    }
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const token = authorization.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string"
    ) {
      res.status(401).json({ error: "Invalid access token." });
      return;
    }

    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    next();
  } catch {
    res.status(401).json({
      error: "Invalid or expired access token.",
    });
  }
};
