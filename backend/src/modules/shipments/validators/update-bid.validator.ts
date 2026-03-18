import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import type { UpdateShipmentBidDto } from "../dto/index.js";

export function validateUpdateBidBody(
  req: Request
): { ok: true; data: UpdateShipmentBidDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const data: UpdateShipmentBidDto = {};

  if (typeof body?.forwarder_name === "string") data.forwarder_name = body.forwarder_name.trim() || undefined;
  if (body?.service_amount != null) {
    const n = Number(body.service_amount);
    if (Number.isFinite(n) && n >= 0) data.service_amount = n;
  }
  if (typeof body?.duration === "string") data.duration = body.duration.trim() || undefined;
  if (typeof body?.origin_port === "string") data.origin_port = body.origin_port.trim() || undefined;
  if (typeof body?.destination_port === "string") data.destination_port = body.destination_port.trim() || undefined;
  if (typeof body?.ship_via === "string") data.ship_via = body.ship_via.trim() || undefined;
  if (typeof body?.quotation_file_name === "string") data.quotation_file_name = body.quotation_file_name.trim() || undefined;
  if (typeof body?.quotation_storage_key === "string") data.quotation_storage_key = body.quotation_storage_key.trim() || undefined;

  return { ok: true, data };
}
