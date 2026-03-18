/**
 * Update received qty per PO line for a linked PO.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

export interface UpdatePoLinesDto {
  lines: { item_id: string; received_qty: number }[];
}

export function validateUpdatePoLinesBody(
  req: Request
): { ok: true; data: UpdatePoLinesDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];
  const raw = body?.lines;
  if (!Array.isArray(raw)) {
    errors.push({ field: "lines", message: "lines must be an array" });
    return { ok: false, errors };
  }
  const lines: { item_id: string; received_qty: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] && typeof raw[i] === "object" ? (raw[i] as Record<string, unknown>) : {};
    const item_id = typeof item.item_id === "string" ? item.item_id.trim() : "";
    const received_qty = typeof item.received_qty === "number" ? item.received_qty : Number(item.received_qty);
    if (!item_id) {
      errors.push({ field: `lines[${i}].item_id`, message: "item_id is required" });
      continue;
    }
    if (!Number.isFinite(received_qty) || received_qty < 0) {
      errors.push({ field: `lines[${i}].received_qty`, message: "received_qty must be a non-negative number" });
      continue;
    }
    lines.push({ item_id, received_qty });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { lines } };
}
