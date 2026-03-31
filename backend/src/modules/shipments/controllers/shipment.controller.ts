/**
 * Shipment controllers: parse request, return response only.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../../../shared/response.js";
import {
  validateCreateShipmentBody,
  validateUpdateShipmentBody,
  validateCloseShipmentBody,
  validateCouplePoBody,
  validateDecouplePoBody,
  validateUpdatePoMappingBody,
  validateUpdatePoLinesBody,
} from "../validators/index.js";
import { ShipmentService } from "../services/shipment.service.js";
import { ShipmentRepository } from "../repositories/shipment.repository.js";
import { ShipmentPoMappingRepository } from "../repositories/shipment-po-mapping.repository.js";
import { ShipmentPoLineReceivedRepository } from "../repositories/shipment-po-line-received.repository.js";
import type { ListShipmentsQuery } from "../dto/index.js";

function actorFromRequest(req: Request): string {
  const name = req.user?.name?.trim();
  if (name) return name;
  const email = req.user?.email?.trim();
  if (email) return email;
  return "Unknown user";
}

const shipmentRepo = new ShipmentRepository();
const mappingRepo = new ShipmentPoMappingRepository();
const lineReceivedRepo = new ShipmentPoLineReceivedRepository();
const service = new ShipmentService(shipmentRepo, mappingRepo, lineReceivedRepo);

function parseListQuery(req: Request): ListShipmentsQuery {
  const q = req.query as Record<string, unknown>;
  const page = q.page != null ? parseInt(String(q.page), 10) : undefined;
  const limit = q.limit != null ? parseInt(String(q.limit), 10) : undefined;
  return {
    page: Number.isNaN(page) ? undefined : page,
    limit: Number.isNaN(limit) ? undefined : limit,
    search: typeof q.search === "string" ? q.search : undefined,
    status: typeof q.status === "string" ? q.status : undefined,
    supplier_name: typeof q.supplier_name === "string" ? q.supplier_name : undefined,
    po_number: typeof q.po_number === "string" ? q.po_number : undefined,
    from_date: typeof q.from_date === "string" ? q.from_date : undefined,
    to_date: typeof q.to_date === "string" ? q.to_date : undefined,
    po_from_date: typeof q.po_from_date === "string" ? q.po_from_date : undefined,
    po_to_date: typeof q.po_to_date === "string" ? q.po_to_date : undefined,
    active_pipeline:
      q.active_pipeline === "true" || q.active_pipeline === "1" || q.active_pipeline === true ? true : undefined,
  };
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  const validation = validateCreateShipmentBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  try {
    const data = await service.create(validation.data);
    sendSuccess(res, data, { message: "Shipment created successfully", statusCode: 201 });
  } catch (e) {
    next(e);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = parseListQuery(req);
    const { items, total } = await service.list(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    sendSuccess(res, items, { meta: { page, limit, total } });
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  try {
    const data = await service.getById(id);
    if (!data) {
      sendError(res, "Shipment not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  const validation = validateUpdateShipmentBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  try {
    const data = await service.update(id, validation.data, actorFromRequest(req));
    if (!data) {
      sendError(res, "Shipment not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data, { message: "Shipment updated successfully" });
  } catch (e) {
    next(e);
  }
}

export async function close(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  const dto = validateCloseShipmentBody(req);
  try {
    await service.close(id, dto.reason ?? null);
    sendSuccess(res, {}, { message: "Shipment closed successfully" });
  } catch (e) {
    next(e);
  }
}

export async function couplePo(req: Request, res: Response, next: NextFunction): Promise<void> {
  const shipmentId = req.params.id as string;
  const validation = validateCouplePoBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  const coupledBy = req.user?.name ?? "System";
  try {
    const data = await service.couplePo(shipmentId, validation.data.intake_ids, coupledBy);
    sendSuccess(res, data ?? {}, { message: "PO(s) coupled to shipment successfully" });
  } catch (e) {
    next(e);
  }
}

export async function decouplePo(req: Request, res: Response, next: NextFunction): Promise<void> {
  const shipmentId = req.params.id as string;
  const validation = validateDecouplePoBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  const decoupledBy = req.user?.name ?? "System";
  try {
    await service.decouplePo(shipmentId, validation.data.intake_id, decoupledBy, validation.data.reason ?? null);
    sendSuccess(res, {}, { message: "PO decoupled from shipment successfully" });
  } catch (e) {
    next(e);
  }
}

export async function listLinkedPos(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  try {
    const data = await service.getById(id);
    if (!data) {
      sendError(res, "Shipment not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data.linked_pos);
  } catch (e) {
    next(e);
  }
}

export async function updatePoMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
  const shipmentId = req.params.id as string;
  const intakeId = req.params.intakeId as string;
  const validation = validateUpdatePoMappingBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  try {
    const data = await service.updatePoMapping(shipmentId, intakeId, validation.data);
    if (!data) {
      sendError(res, "Shipment or linked PO not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data, { message: "Linked PO updated successfully" });
  } catch (e) {
    next(e);
  }
}

export async function updatePoLines(req: Request, res: Response, next: NextFunction): Promise<void> {
  const shipmentId = req.params.id as string;
  const intakeId = req.params.intakeId as string;
  const validation = validateUpdatePoLinesBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  try {
    const { lines } = validation.data;
    const data = await service.updatePoLines(shipmentId, intakeId, lines);
    if (!data) {
      sendError(res, "Shipment not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data, { message: "Received quantities updated successfully" });
  } catch (e) {
    next(e);
  }
}
