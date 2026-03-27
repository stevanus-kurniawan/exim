/**
 * Shipment activity log — merged audit trail for the detail UI.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../../shared/response.js";
import { ShipmentRepository } from "../repositories/shipment.repository.js";
import { ShipmentStatusHistoryRepository } from "../repositories/shipment-status-history.repository.js";
import { ShipmentNoteRepository } from "../repositories/shipment-note.repository.js";
import { ShipmentPoMappingRepository } from "../repositories/shipment-po-mapping.repository.js";
import { ShipmentUpdateLogRepository } from "../repositories/shipment-update-log.repository.js";
import { ShipmentActivityService } from "../services/shipment-activity.service.js";

const shipmentRepo = new ShipmentRepository();
const historyRepo = new ShipmentStatusHistoryRepository();
const noteRepo = new ShipmentNoteRepository();
const mappingRepo = new ShipmentPoMappingRepository();
const updateLogRepo = new ShipmentUpdateLogRepository();
const service = new ShipmentActivityService(shipmentRepo, historyRepo, noteRepo, mappingRepo, updateLogRepo);

export async function getActivityLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  try {
    const data = await service.getActivityLog(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}
