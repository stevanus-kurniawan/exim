/**
 * Shipment notes (comments) — HTTP handlers.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../../../shared/response.js";
import { validateCreateShipmentNoteBody } from "../validators/create-shipment-note.validator.js";
import { ShipmentNoteService } from "../services/shipment-note.service.js";
import { ShipmentRepository } from "../repositories/shipment.repository.js";
import { ShipmentNoteRepository } from "../repositories/shipment-note.repository.js";

const shipmentRepo = new ShipmentRepository();
const noteRepo = new ShipmentNoteRepository();
const service = new ShipmentNoteService(shipmentRepo, noteRepo);

function displayNameFromUser(req: Request): string {
  const u = req.user;
  const name = u?.name?.trim();
  if (name) return name;
  const email = u?.email?.trim();
  if (email) return email;
  return "Unknown user";
}

export async function listNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  try {
    const data = await service.list(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  const validation = validateCreateShipmentNoteBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  const userId = req.user?.id ?? null;
  const name = displayNameFromUser(req);
  try {
    const data = await service.create(id, validation.note, userId, name);
    sendSuccess(res, data, { message: "Note added", statusCode: 201 });
  } catch (e) {
    next(e);
  }
}
