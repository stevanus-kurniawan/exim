/**
 * Refresh and logout request validation (API Spec §6.0: refresh_token required).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

export interface RefreshInput {
  refresh_token: string;
}

export function validateRefreshBody(req: Request): { ok: true; data: RefreshInput } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const refresh_token = typeof body?.refresh_token === "string" ? body.refresh_token.trim() : "";
  if (!refresh_token) {
    errors.push({ field: "refresh_token", message: "Refresh token is required" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: { refresh_token } };
}
