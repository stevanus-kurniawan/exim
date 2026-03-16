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
} from "../validators/index.js";
import { ShipmentService } from "../services/shipment.service.js";
import { ShipmentRepository } from "../repositories/shipment.repository.js";
import { ShipmentPoMappingRepository } from "../repositories/shipment-po-mapping.repository.js";
import type { ListShipmentsQuery } from "../dto/index.js";

const shipmentRepo = new ShipmentRepository();
const mappingRepo = new ShipmentPoMappingRepository();
const service = new ShipmentService(shipmentRepo, mappingRepo);

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
    const data = await service.update(id, validation.data);
    if (!data) {
      sendError(res, "Shipment not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, { id: data.id }, { message: "Shipment updated successfully" });
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
