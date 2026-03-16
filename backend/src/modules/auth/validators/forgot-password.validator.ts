/**
 * Forgot password request: email.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ForgotPasswordInput {
  email: string;
}

export function validateForgotPasswordBody(req: Request): { ok: true; data: ForgotPasswordInput } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: "email", message: "Email must be a valid email format" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: { email } };
}
