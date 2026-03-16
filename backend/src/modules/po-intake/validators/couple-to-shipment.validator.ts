/**
 * Couple this intake to an existing shipment. Request body: shipment_id.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";

export interface CoupleToShipmentDto {
  shipment_id: string;
}

export function validateCoupleToShipmentBody(
  req: Request
): { ok: true; data: CoupleToShipmentDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const shipment_id = typeof body?.shipment_id === "string" ? body.shipment_id.trim() : "";
  if (!shipment_id) {
    errors.push({ field: "shipment_id", message: "shipment_id is required" });
    return { ok: false, errors };
  }

  return { ok: true, data: { shipment_id } };
}
