/**
 * Rate limits for unauthenticated auth endpoints (credential stuffing / abuse mitigation).
 */

import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { sendError } from "../shared/response.js";

function tooMany(req: Request, res: Response): void {
  sendError(res, "Too many requests. Please try again later.", { statusCode: 429 });
}

/** Login, refresh, logout — per IP. */
export const authCredentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => tooMany(req, res),
});

/** Email verification and password reset token submission — per IP. */
export const authTokenFlowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => tooMany(req, res),
});

/** Forgot-password — stricter (enumeration / mail abuse). */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => tooMany(req, res),
});
