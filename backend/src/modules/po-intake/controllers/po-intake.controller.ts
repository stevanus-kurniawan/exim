/**
 * PO intake controllers: parse request, return response only.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../../../shared/response.js";
import { validateCreateIntakeBody, validateCoupleToShipmentBody } from "../validators/index.js";
import { PoIntakeService } from "../services/po-intake.service.js";
import { PoIntakeRepository } from "../repositories/po-intake.repository.js";
import { ShipmentService } from "../../shipments/services/shipment.service.js";
import { ShipmentRepository } from "../../shipments/repositories/shipment.repository.js";
import { ShipmentPoMappingRepository } from "../../shipments/repositories/shipment-po-mapping.repository.js";
import type { ListPoIntakeQuery } from "../dto/index.js";

const repo = new PoIntakeRepository();
const service = new PoIntakeService(repo);
const shipmentRepo = new ShipmentRepository();
const mappingRepo = new ShipmentPoMappingRepository();
const shipmentService = new ShipmentService(shipmentRepo, mappingRepo);

function parseListQuery(req: Request): ListPoIntakeQuery {
  const q = req.query as Record<string, unknown>;
  const page = q.page != null ? parseInt(String(q.page), 10) : undefined;
  const limit = q.limit != null ? parseInt(String(q.limit), 10) : undefined;
  return {
    page: Number.isNaN(page) ? undefined : page,
    limit: Number.isNaN(limit) ? undefined : limit,
    search: typeof q.search === "string" ? q.search : undefined,
    intake_status: typeof q.intake_status === "string" ? q.intake_status : undefined,
    po_number: typeof q.po_number === "string" ? q.po_number : undefined,
  };
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  const validation = validateCreateIntakeBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  try {
    const data = await service.create(validation.data);
    sendSuccess(res, data, { message: "PO intake created successfully", statusCode: 201 });
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
      sendError(res, "PO intake not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function takeOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user?.id ?? req.user?.name ?? "unknown";
  try {
    const data = await service.takeOwnership(id, userId);
    if (!data) {
      sendError(res, "PO intake not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data, { message: "Ownership taken successfully" });
  } catch (e) {
    next(e);
  }
}

/** POST /po/:id/create-shipment — create a new shipment and couple this intake to it. */
export async function createShipment(req: Request, res: Response, next: NextFunction): Promise<void> {
  const intakeId = req.params.id as string;
  const userName = req.user?.name ?? "System";
  try {
    const intake = await service.getById(intakeId);
    if (!intake) {
      sendError(res, "PO intake not found", { statusCode: 404 });
      return;
    }
    if (intake.intake_status === "GROUPED_TO_SHIPMENT") {
      sendError(res, "PO intake is already grouped to a shipment", { statusCode: 409 });
      return;
    }
    const created = await shipmentService.create({});
    const shipment = await shipmentService.couplePo(created.id, [intakeId], userName);
    sendSuccess(
      res,
      { shipment_id: created.id, shipment_number: created.shipment_number, shipment: shipment ?? undefined },
      { message: "Shipment created and PO coupled successfully", statusCode: 201 }
    );
  } catch (e) {
    next(e);
  }
}

/** POST /po/:id/couple-to-shipment — couple this intake to an existing shipment. */
export async function coupleToShipment(req: Request, res: Response, next: NextFunction): Promise<void> {
  const intakeId = req.params.id as string;
  const validation = validateCoupleToShipmentBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  const userName = req.user?.name ?? "System";
  try {
    const intake = await service.getById(intakeId);
    if (!intake) {
      sendError(res, "PO intake not found", { statusCode: 404 });
      return;
    }
    if (intake.intake_status === "GROUPED_TO_SHIPMENT") {
      sendError(res, "PO intake is already grouped to a shipment", { statusCode: 409 });
      return;
    }
    const shipment = await shipmentService.couplePo(validation.data.shipment_id, [intakeId], userName);
    sendSuccess(res, shipment ?? {}, { message: "PO coupled to shipment successfully" });
  } catch (e) {
    next(e);
  }
}
