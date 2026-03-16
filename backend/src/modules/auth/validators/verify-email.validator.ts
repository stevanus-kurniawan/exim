/**
 * Verify email request: token (query or body).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

export interface VerifyEmailInput {
  token: string;
}

export function validateVerifyEmail(req: Request): { ok: true; data: VerifyEmailInput } | { ok: false; errors: ErrorField[] } {
  const tokenFromQuery = typeof req.query?.token === "string" ? req.query.token.trim() : "";
  const body = req.body as Record<string, unknown>;
  const tokenFromBody = typeof body?.token === "string" ? body.token.trim() : "";
  const token = tokenFromQuery || tokenFromBody;

  if (!token) {
    return { ok: false, errors: [{ field: "token", message: "Verification token is required" }] };
  }
  return { ok: true, data: { token } };
}
