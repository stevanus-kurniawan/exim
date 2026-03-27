/**
 * Shipment notes (comments) — business logic.
 */

import { AppError } from "../../../middlewares/errorHandler.js";
import { ShipmentRepository } from "../repositories/shipment.repository.js";
import { ShipmentNoteRepository, type ShipmentNoteRow } from "../repositories/shipment-note.repository.js";

export interface ShipmentNoteDto {
  id: string;
  shipment_id: string;
  note: string;
  created_by_user_id: string | null;
  created_by_name: string;
  created_at: string;
}

function toDto(row: ShipmentNoteRow): ShipmentNoteDto {
  return {
    id: row.id,
    shipment_id: row.shipment_id,
    note: row.note,
    created_by_user_id: row.created_by_user_id,
    created_by_name: row.created_by_name,
    created_at: row.created_at.toISOString(),
  };
}

export class ShipmentNoteService {
  constructor(
    private readonly shipmentRepo: ShipmentRepository,
    private readonly noteRepo: ShipmentNoteRepository
  ) {}

  async list(shipmentId: string): Promise<ShipmentNoteDto[]> {
    const shipment = await this.shipmentRepo.findById(shipmentId);
    if (!shipment) throw new AppError("Shipment not found", 404);
    const rows = await this.noteRepo.listByShipmentId(shipmentId);
    return rows.map(toDto);
  }

  async create(
    shipmentId: string,
    note: string,
    userId: string | null,
    displayName: string
  ): Promise<ShipmentNoteDto> {
    const shipment = await this.shipmentRepo.findById(shipmentId);
    if (!shipment) throw new AppError("Shipment not found", 404);
    const row = await this.noteRepo.create(shipmentId, note, userId, displayName);
    return toDto(row);
  }
}
