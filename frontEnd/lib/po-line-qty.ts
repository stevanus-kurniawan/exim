/**
 * Shared PO line quantity display & parsing for PO detail and shipment (linked PO) UIs.
 * Keeps Qty, delivered qty, and remaining qty consistent between pages.
 */

import { formatDecimal, formatPriceInputWithCommas, stripCommaThousands } from "./format-number";

/** PO qty / remaining / delivered display — two decimal places (same as PO detail tables). */
export function formatPoLineQtyDisplay(value: number | null | undefined): string {
  return formatDecimal(value);
}

/** Parse delivered-qty text input (comma thousands, dot decimal). */
export function parseDeliveredQtyInput(raw: string | null | undefined): number {
  const normalized = stripCommaThousands(raw ?? "").trim();
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Initial / controlled value for delivered qty fields (matches other decimal inputs in this project). */
export function deliveredQtyToInputString(qty: number): string {
  if (!Number.isFinite(qty)) return "";
  return formatPriceInputWithCommas(String(qty));
}

function parseNullableQty(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = stripCommaThousands(value).trim();
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Projected remaining qty for a PO line while editing this shipment's delivered qty.
 * For shipment UI, show remaining based on current line qty minus delivered qty input.
 */
export function projectedRemainingQtyForShipmentLine(
  item: { qty: number | null; remaining_qty: number | null; received_qty?: number | null },
  savedThisShipmentQty: number,
  draftDeliveredQty: number
): number | null {
  const qty = parseNullableQty(item.qty);
  const remainingQty = parseNullableQty(item.remaining_qty);
  if (qty != null) {
    return Math.max(0, qty - draftDeliveredQty);
  }
  if (remainingQty != null) {
    return Math.max(0, remainingQty + savedThisShipmentQty - draftDeliveredQty);
  }
  return null;
}
