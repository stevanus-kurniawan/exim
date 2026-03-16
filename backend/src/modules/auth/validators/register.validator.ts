/**
 * Register request validation: name, email, password, password_confirmation.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export function validateRegisterBody(req: Request): { ok: true; data: RegisterInput } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    errors.push({ field: "name", message: "Name is required" });
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: "email", message: "Email must be a valid email format" });
  }

  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push({ field: "password", message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const passwordConfirmation = typeof body?.password_confirmation === "string" ? body.password_confirmation : "";
  if (!passwordConfirmation) {
    errors.push({ field: "password_confirmation", message: "Confirmation password is required" });
  } else if (password !== passwordConfirmation) {
    errors.push({ field: "password_confirmation", message: "Passwords do not match" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: { name, email, password } };
}
