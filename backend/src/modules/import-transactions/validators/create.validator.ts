/**
 * Create import transaction validation (API Spec §6.1).
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import type { CreateImportTransactionDto } from "../dto/index.js";

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const s = typeof v === "string" ? v : String(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function validateCreateBody(
  req: Request
): { ok: true; data: CreateImportTransactionDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const po_number = typeof body?.po_number === "string" ? body.po_number.trim() : "";
  if (!po_number) errors.push({ field: "po_number", message: "PO Number is required" });

  const supplier_name = typeof body?.supplier_name === "string" ? body.supplier_name.trim() : "";
  if (!supplier_name) errors.push({ field: "supplier_name", message: "Supplier name is required" });

  const origin_port_code = typeof body?.origin_port_code === "string" ? body.origin_port_code.trim() : "";
  if (!origin_port_code) errors.push({ field: "origin_port_code", message: "Origin port code is required" });

  const destination_port_code =
    typeof body?.destination_port_code === "string" ? body.destination_port_code.trim() : "";
  if (!destination_port_code)
    errors.push({ field: "destination_port_code", message: "Destination port code is required" });

  const etaRaw = body?.eta;
  const eta = typeof etaRaw === "string" ? etaRaw.trim() : etaRaw == null ? "" : String(etaRaw);
  if (!eta) {
    errors.push({ field: "eta", message: "ETA is required" });
  } else if (!parseDate(etaRaw)) {
    errors.push({ field: "eta", message: "ETA must be a valid date" });
  }

  const estimated_value = body?.estimated_value;
  if (estimated_value != null) {
    const n = Number(estimated_value);
    if (Number.isNaN(n) || n < 0) {
      errors.push({ field: "estimated_value", message: "Estimated value must be a number greater than or equal to 0" });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: CreateImportTransactionDto = {
    po_number,
    supplier_name,
    origin_port_code,
    destination_port_code,
    eta,
  };
  if (typeof body?.purchase_request_number === "string") data.purchase_request_number = body.purchase_request_number.trim();
  if (typeof body?.item_name === "string") data.item_name = body.item_name.trim();
  if (typeof body?.item_category === "string") data.item_category = body.item_category.trim();
  if (typeof body?.supplier_country === "string") data.supplier_country = body.supplier_country.trim();
  if (typeof body?.incoterm === "string") data.incoterm = body.incoterm.trim();
  if (typeof body?.currency === "string") data.currency = body.currency.trim();
  if (typeof body?.remarks === "string") data.remarks = body.remarks.trim();
  if (typeof body?.origin_port_name === "string") data.origin_port_name = body.origin_port_name.trim();
  if (typeof body?.destination_port_name === "string") data.destination_port_name = body.destination_port_name.trim();
  if (estimated_value != null && !Number.isNaN(Number(estimated_value))) data.estimated_value = Number(estimated_value);

  return { ok: true, data };
}
