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
  const etdRaw = body?.etd;
  if (etdRaw != null) {
    if (typeof etdRaw !== "string" || !parseDate(etdRaw)) {
      errors.push({ field: "etd", message: "ETD must be a valid date" });
    }
  }
  const closedAtRaw = body?.closed_at;
  if (closedAtRaw != null) {
    if (typeof closedAtRaw !== "string" || !parseDate(closedAtRaw)) {
      errors.push({ field: "closed_at", message: "Closed at must be a valid date" });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: UpdateShipmentDto = {};
  if (etdRaw != null && typeof etdRaw === "string") data.etd = etdRaw.trim();
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
  if (body?.bm_percentage != null) {
    const n = Number(body.bm_percentage);
    if (!Number.isFinite(n) || n < 0 || n > 100) errors.push({ field: "bm_percentage", message: "BM percentage must be between 0 and 100" });
    else data.bm_percentage = n;
  }
  if (typeof body?.origin_port_name === "string") data.origin_port_name = body.origin_port_name.trim() || undefined;
  if (typeof body?.origin_port_country === "string") data.origin_port_country = body.origin_port_country.trim() || undefined;
  if (typeof body?.forwarder_name === "string") data.forwarder_name = body.forwarder_name.trim() || undefined;
  if (typeof body?.shipment_method === "string") data.shipment_method = body.shipment_method.trim() || undefined;
  if (typeof body?.destination_port_name === "string") data.destination_port_name = body.destination_port_name.trim() || undefined;
  if (typeof body?.destination_port_country === "string") data.destination_port_country = body.destination_port_country.trim() || undefined;
  if (typeof body?.vendor_name === "string") data.vendor_name = body.vendor_name.trim() || undefined;
  if (typeof body?.warehouse_name === "string") data.warehouse_name = body.warehouse_name.trim() || undefined;
  if (typeof body?.incoterm === "string") data.incoterm = body.incoterm.trim() || undefined;
  if (typeof body?.kawasan_berikat === "string") data.kawasan_berikat = body.kawasan_berikat.trim() || undefined;
  if (closedAtRaw != null && typeof closedAtRaw === "string") data.closed_at = closedAtRaw.trim();
  if (typeof body?.close_reason === "string") data.close_reason = body.close_reason.trim() || undefined;

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, data };
}
