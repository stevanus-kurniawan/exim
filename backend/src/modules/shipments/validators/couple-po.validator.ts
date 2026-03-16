/**
 * Couple PO(s) to shipment validation.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import type { CouplePoDto } from "../dto/index.js";

export function validateCouplePoBody(
  req: Request
): { ok: true; data: CouplePoDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const raw = body?.intake_ids;
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push({ field: "intake_ids", message: "intake_ids must be a non-empty array of intake IDs" });
    return { ok: false, errors };
  }

  const intake_ids = raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  if (intake_ids.length === 0) {
    errors.push({ field: "intake_ids", message: "At least one valid intake_id is required" });
    return { ok: false, errors };
  }

  return { ok: true, data: { intake_ids } };
}
