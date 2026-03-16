/**
 * PO intake service: business logic. Store ingested PO, prevent duplicates, track status, assignment.
 */

import { PoIntakeRepository } from "../repositories/po-intake.repository.js";
import { AppError } from "../../../middlewares/errorHandler.js";
import type {
  CreatePoIntakeDto,
  ListPoIntakeQuery,
  PoIntakeRow,
  PoIntakeItemRow,
  PoIntakeListItem,
  PoIntakeDetail,
  CreatePoIntakeResponse,
} from "../dto/index.js";

function toListItem(row: PoIntakeRow): PoIntakeListItem {
  return {
    id: row.id,
    external_id: row.external_id,
    po_number: row.po_number,
    plant: row.plant,
    supplier_name: row.supplier_name,
    delivery_location: row.delivery_location,
    incoterm_location: row.incoterm_location,
    intake_status: row.intake_status,
    taken_at: row.taken_at ? row.taken_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
  };
}

function toDetail(row: PoIntakeRow, items: PoIntakeItemRow[]): PoIntakeDetail {
  return {
    id: row.id,
    external_id: row.external_id,
    po_number: row.po_number,
    plant: row.plant,
    supplier_name: row.supplier_name,
    delivery_location: row.delivery_location,
    incoterm_location: row.incoterm_location,
    kawasan_berikat: row.kawasan_berikat,
    intake_status: row.intake_status,
    taken_by_user_id: row.taken_by_user_id,
    taken_at: row.taken_at ? row.taken_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    items: items.map((it) => ({
      id: it.id,
      line_number: it.line_number,
      item_description: it.item_description,
      qty: it.qty,
      unit: it.unit,
      value: it.value,
      kurs: it.kurs,
    })),
  };
}

export class PoIntakeService {
  constructor(private readonly repo: PoIntakeRepository) {}

  /** Create intake (ingestion or test-create). Prevents duplicate by external_id. */
  async create(dto: CreatePoIntakeDto, options?: { skipDuplicateCheck?: boolean }): Promise<CreatePoIntakeResponse> {
    if (!options?.skipDuplicateCheck) {
      const exists = await this.repo.existsByExternalId(dto.external_id);
      if (exists) {
        throw new AppError("Duplicate PO intake: external_id already exists", 409);
      }
    }
    const row = await this.repo.create(dto, "NEW_PO_DETECTED");
    await this.repo.insertItems(row.id, dto.items);
    return {
      id: row.id,
      external_id: row.external_id,
      po_number: row.po_number,
      intake_status: row.intake_status,
      created_at: row.created_at.toISOString(),
    };
  }

  /** Mark as NOTIFIED (e.g. after app notification sent). Idempotent for NEW_PO_DETECTED. */
  async markNotified(id: string): Promise<void> {
    const row = await this.repo.findById(id);
    if (!row) throw new AppError("PO intake not found", 404);
    if (row.intake_status !== "NEW_PO_DETECTED") return;
    await this.repo.updateStatusToNotified(id);
  }

  async list(query: ListPoIntakeQuery): Promise<{ items: PoIntakeListItem[]; total: number }> {
    const { rows, total } = await this.repo.findAll(query);
    return { items: rows.map(toListItem), total };
  }

  async getById(id: string): Promise<PoIntakeDetail | null> {
    const row = await this.repo.findById(id);
    if (!row) return null;
    const items = await this.repo.findItemsByIntakeId(id);
    return toDetail(row, items);
  }

  async takeOwnership(id: string, userId: string): Promise<PoIntakeDetail | null> {
    const row = await this.repo.findById(id);
    if (!row) throw new AppError("PO intake not found", 404);
    if (row.intake_status === "GROUPED_TO_SHIPMENT") {
      throw new AppError("PO intake already grouped to a shipment", 409);
    }
    const updated = await this.repo.takeOwnership(id, userId);
    if (!updated) return null;
    const items = await this.repo.findItemsByIntakeId(id);
    return toDetail(updated, items);
  }

  /** Called by shipment service when coupling PO. */
  async setGroupedToShipment(intakeId: string): Promise<void> {
    await this.repo.setGroupedToShipment(intakeId);
  }
}
