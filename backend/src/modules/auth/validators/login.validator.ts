/**
 * Login request validation (API Spec §6.0: email required + valid, password required).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginInput {
  email: string;
  password: string;
}

export function validateLoginBody(req: Request): { ok: true; data: LoginInput } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: "email", message: "Email must be a valid email format" });
  }

  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: { email, password } };
}
