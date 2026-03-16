/**
 * Update import transaction validation (partial: eta, remarks).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import type { UpdateImportTransactionDto } from "../dto/index.js";

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const d = new Date(typeof v === "string" ? v : String(v));
  return isNaN(d.getTime()) ? null : d;
}

export function validateUpdateBody(
  req: Request
): { ok: true; data: UpdateImportTransactionDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const data: UpdateImportTransactionDto = {};

  if (body?.eta !== undefined) {
    const eta = typeof body.eta === "string" ? body.eta.trim() : String(body.eta);
    if (!eta) {
      return { ok: false, errors: [{ field: "eta", message: "ETA must be a valid date when provided" }] };
    }
    if (!parseDate(body.eta)) {
      return { ok: false, errors: [{ field: "eta", message: "ETA must be a valid date" }] };
    }
    data.eta = eta;
  }
  if (body?.remarks !== undefined) {
    data.remarks = typeof body.remarks === "string" ? body.remarks : String(body.remarks);
  }

  return { ok: true, data };
}
