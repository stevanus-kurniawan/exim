/**
 * Update status request validation (API Spec §6.2: new_status required).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import { IMPORT_TRANSACTION_STATUSES } from "../dto/index.js";

export interface UpdateStatusInput {
  new_status: string;
  remarks?: string;
}

const VALID_SET = new Set<string>(IMPORT_TRANSACTION_STATUSES);

export function validateUpdateStatusBody(
  req: Request
): { ok: true; data: UpdateStatusInput } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const new_status = typeof body?.new_status === "string" ? body.new_status.trim() : "";
  if (!new_status) {
    errors.push({ field: "new_status", message: "New status is required" });
  } else if (!VALID_SET.has(new_status)) {
    errors.push({ field: "new_status", message: "New status must be a valid status value" });
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: UpdateStatusInput = { new_status };
  if (typeof body?.remarks === "string") data.remarks = body.remarks.trim();
  return { ok: true, data };
}
