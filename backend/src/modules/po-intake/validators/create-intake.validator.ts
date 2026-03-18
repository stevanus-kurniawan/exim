/**
 * Create PO intake validation (ingestion / test-create). SaaS payload shape.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import type { CreatePoIntakeDto, PoIntakeItemDto } from "../dto/index.js";

function parseItems(body: unknown): PoIntakeItemDto[] | undefined {
  if (!Array.isArray(body)) return undefined;
  return body.map((item) => {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      item_description: typeof o.item_description === "string" ? o.item_description : undefined,
      qty: typeof o.qty === "number" ? o.qty : undefined,
      unit: typeof o.unit === "string" ? o.unit : undefined,
      value: typeof o.value === "number" ? o.value : undefined,
      kurs: typeof o.kurs === "number" ? o.kurs : undefined,
    };
  });
}

export function validateCreateIntakeBody(
  req: Request
): { ok: true; data: CreatePoIntakeDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const external_id = typeof body?.external_id === "string" ? body.external_id.trim() : "";
  if (!external_id) errors.push({ field: "external_id", message: "external_id is required" });

  const po_number = typeof body?.po_number === "string" ? body.po_number.trim() : "";
  if (!po_number) errors.push({ field: "po_number", message: "po_number is required" });

  const supplier_name = typeof body?.supplier_name === "string" ? body.supplier_name.trim() : "";
  if (!supplier_name) errors.push({ field: "supplier_name", message: "supplier_name is required" });

  if (errors.length > 0) return { ok: false, errors };

  const data: CreatePoIntakeDto = {
    external_id,
    po_number,
    supplier_name,
  };
  if (typeof body?.plant === "string") data.plant = body.plant.trim();
  if (typeof body?.delivery_location === "string") data.delivery_location = body.delivery_location.trim();
  if (typeof body?.incoterm_location === "string") data.incoterm_location = body.incoterm_location.trim();
  if (typeof body?.kawasan_berikat === "string") data.kawasan_berikat = body.kawasan_berikat.trim();
  if (typeof body?.currency === "string") data.currency = body.currency.trim();
  const items = parseItems(body?.items);
  if (items && items.length > 0) data.items = items;

  return { ok: true, data };
}
