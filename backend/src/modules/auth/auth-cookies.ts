/**
 * HttpOnly cookie names and helpers for access/refresh tokens (not readable by JS).
 */

import type { Response } from "express";
import { config } from "../../config/index.js";

export const ACCESS_TOKEN_COOKIE = "eos_access";
export const REFRESH_TOKEN_COOKIE = "eos_refresh";

const REFRESH_MAX_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookies(
  res: Response,
  data: { access_token: string; refresh_token: string; expires_in: number }
): void {
  const { access_token, refresh_token, expires_in } = data;
  const secure = config.cookieSecure;
  const maxAgeAccess = Math.max(expires_in * 1000, 60_000);
  res.cookie(ACCESS_TOKEN_COOKIE, access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: maxAgeAccess,
    path: "/",
  });
  res.cookie(REFRESH_TOKEN_COOKIE, refresh_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: REFRESH_MAX_MS,
    path: "/",
  });
}

/** Must match setAuthCookies flags or browsers may not remove the HttpOnly cookies. */
export function clearAuthCookies(res: Response): void {
  const secure = config.cookieSecure;
  const opts = { path: "/", sameSite: "lax" as const, secure, httpOnly: true };
  res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
  res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
}
