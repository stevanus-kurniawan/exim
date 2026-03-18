import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import type { CreateShipmentBidDto } from "../dto/index.js";

export function validateCreateBidBody(
  req: Request
): { ok: true; data: CreateShipmentBidDto } | { ok: false; errors: ErrorField[] } {
  const body = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];

  const forwarder_name = typeof body?.forwarder_name === "string" ? body.forwarder_name.trim() : "";
  if (!forwarder_name) {
    errors.push({ field: "forwarder_name", message: "Forwarder name is required" });
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: CreateShipmentBidDto = { forwarder_name };
  if (body?.service_amount != null) {
    const n = Number(body.service_amount);
    if (Number.isFinite(n) && n >= 0) data.service_amount = n;
  }
  if (typeof body?.duration === "string") data.duration = body.duration.trim() || undefined;
  if (typeof body?.origin_port === "string") data.origin_port = body.origin_port.trim() || undefined;
  if (typeof body?.destination_port === "string") data.destination_port = body.destination_port.trim() || undefined;
  if (typeof body?.ship_via === "string") data.ship_via = body.ship_via.trim() || undefined;

  return { ok: true, data };
}
