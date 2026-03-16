/**
 * Decouple PO from shipment validation.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import type { DecouplePoDto } from "../dto/index.js";

export function validateDecouplePoBody(
  req: Request
): { ok: true; data: DecouplePoDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const intake_id = typeof body?.intake_id === "string" ? body.intake_id.trim() : "";
  if (!intake_id) {
    errors.push({ field: "intake_id", message: "intake_id is required" });
    return { ok: false, errors };
  }

  const data: DecouplePoDto = { intake_id };
  if (typeof body?.reason === "string") data.reason = body.reason.trim();
  return { ok: true, data };
}
