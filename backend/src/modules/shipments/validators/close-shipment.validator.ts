/**
 * Close shipment validation.
 */

import type { Request } from "express";
import type { CloseShipmentDto } from "../dto/index.js";

export function validateCloseShipmentBody(req: Request): CloseShipmentDto {
  const body = req.body as Record<string, unknown>;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;
  return { reason };
}
