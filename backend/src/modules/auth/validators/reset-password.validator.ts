/**
 * Reset password request: token, new_password, password_confirmation.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

const MIN_PASSWORD_LENGTH = 8;

export interface ResetPasswordInput {
  token: string;
  new_password: string;
}

export function validateResetPasswordBody(req: Request): { ok: true; data: ResetPasswordInput } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const query = req.query as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const tokenFromBody = typeof body?.token === "string" ? body.token.trim() : "";
  const tokenFromQuery = typeof query?.token === "string" ? query.token.trim() : "";
  const token = tokenFromBody || tokenFromQuery;
  if (!token) {
    errors.push({ field: "token", message: "Reset token is required" });
  }

  const newPassword = typeof body?.new_password === "string" ? body.new_password : "";
  if (!newPassword) {
    errors.push({ field: "new_password", message: "New password is required" });
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.push({ field: "new_password", message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const passwordConfirmation = typeof body?.password_confirmation === "string" ? body.password_confirmation : "";
  if (!passwordConfirmation) {
    errors.push({ field: "password_confirmation", message: "Confirmation password is required" });
  } else if (newPassword !== passwordConfirmation) {
    errors.push({ field: "password_confirmation", message: "Passwords do not match" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: { token, new_password: newPassword } };
}
