/**
 * Update shipment validation (partial).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import type { UpdateShipmentDto } from "../dto/index.js";

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const s = typeof v === "string" ? v : String(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function validateUpdateShipmentBody(
  req: Request
): { ok: true; data: UpdateShipmentDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const etaRaw = body?.eta;
  if (etaRaw != null) {
    if (typeof etaRaw !== "string" || !parseDate(etaRaw)) {
      errors.push({ field: "eta", message: "ETA must be a valid date" });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: UpdateShipmentDto = {};
  if (etaRaw != null && typeof etaRaw === "string") data.eta = etaRaw.trim();
  if (typeof body?.remarks === "string") data.remarks = body.remarks.trim();
  if (typeof body?.pib_type === "string") data.pib_type = body.pib_type.trim() || undefined;
  if (typeof body?.no_request_pib === "string") data.no_request_pib = body.no_request_pib.trim() || undefined;
  if (typeof body?.nopen === "string") data.nopen = body.nopen.trim() || undefined;
  if (body?.nopen_date != null) {
    const nd = typeof body.nopen_date === "string" ? body.nopen_date.trim() : "";
    data.nopen_date = nd || undefined;
  }
  if (typeof body?.ship_by === "string") data.ship_by = body.ship_by.trim() || undefined;
  if (typeof body?.bl_awb === "string") data.bl_awb = body.bl_awb.trim() || undefined;
  if (typeof body?.insurance_no === "string") data.insurance_no = body.insurance_no.trim() || undefined;
  if (typeof body?.coo === "string") data.coo = body.coo.trim() || undefined;
  if (body?.incoterm_amount != null) {
    const n = Number(body.incoterm_amount);
    if (!Number.isFinite(n) || n < 0) errors.push({ field: "incoterm_amount", message: "Must be a non-negative number" });
    else data.incoterm_amount = n;
  }
  if (body?.bm != null) {
    const n = Number(body.bm);
    if (!Number.isFinite(n) || n < 0) errors.push({ field: "bm", message: "Must be a non-negative number" });
    else data.bm = n;
  }

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, data };
}
