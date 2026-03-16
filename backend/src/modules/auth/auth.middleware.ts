/**
 * Auth middleware: verify JWT, attach req.user. Use on protected routes.
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config/index.js";
import { sendError } from "../../shared/response.js";
import type { AuthUser } from "./dto/index.js";
import type { AccessTokenPayload } from "./dto/index.js";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "Missing or invalid authorization header", { statusCode: 401 });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    sendError(res, "Missing or invalid authorization header", { statusCode: 401 });
    return;
  }

  const secret = config.jwt.accessSecret;
  if (!secret) {
    sendError(res, "Authentication not configured", { statusCode: 500 });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AccessTokenPayload;
    if (payload.type !== "access" || !payload.sub) {
      sendError(res, "Invalid token", { statusCode: 401 });
      return;
    }
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email ?? "",
      name: payload.name ?? "",
      role: payload.role ?? "",
    };
    req.user = user;
    next();
  } catch {
    sendError(res, "Invalid or expired token", { statusCode: 401 });
  }
}
