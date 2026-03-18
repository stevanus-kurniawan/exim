/**
 * Update linked PO mapping (invoice_no, currency_rate).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

export interface UpdatePoMappingDto {
  invoice_no?: string | null;
  currency_rate?: number | null;
}

export function validateUpdatePoMappingBody(
  req: Request
): { ok: true; data: UpdatePoMappingDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const data: UpdatePoMappingDto = {};
  if (body?.invoice_no !== undefined) {
    data.invoice_no = typeof body.invoice_no === "string" ? body.invoice_no.trim() || null : null;
  }
  if (body?.currency_rate !== undefined) {
    const n = Number(body.currency_rate);
    data.currency_rate = Number.isFinite(n) && n >= 0 ? n : null;
  }
  return { ok: true, data };
}
