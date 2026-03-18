/**
 * PO intake service: business logic. Store ingested PO, prevent duplicates, track status, assignment.
 */

import { PoIntakeRepository } from "../repositories/po-intake.repository.js";
import type { LinkedShipmentByIntake } from "../../shipments/repositories/shipment-po-mapping.repository.js";
import type { UserRepository } from "../../auth/repositories/user.repository.js";
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

function toDetail(
  row: PoIntakeRow,
  items: PoIntakeItemRow[],
  linkedShipments: LinkedShipmentByIntake[],
  takenByName: string | null
): PoIntakeDetail {
  return {
    id: row.id,
    external_id: row.external_id,
    po_number: row.po_number,
    plant: row.plant,
    supplier_name: row.supplier_name,
    delivery_location: row.delivery_location,
    incoterm_location: row.incoterm_location,
    kawasan_berikat: row.kawasan_berikat,
    currency: row.currency ?? null,
    intake_status: row.intake_status,
    taken_by_user_id: row.taken_by_user_id,
    taken_by_name: takenByName,
    taken_at: row.taken_at ? row.taken_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    items: items.map((it) => {
      const qty = it.qty ?? 0;
      const receivedQty = 0; // TODO: aggregate from delivery/shipment receipts when available
      const remainingQty = Math.max(0, qty - receivedQty);
      const overReceivedPct =
        qty > 0 && receivedQty > qty ? ((receivedQty - qty) / qty) * 100 : null;
      return {
        id: it.id,
        line_number: it.line_number,
        item_description: it.item_description,
        qty: it.qty,
        unit: it.unit,
        value: it.value,
        kurs: it.kurs,
        received_qty: receivedQty,
        remaining_qty: remainingQty,
        over_received_pct: overReceivedPct,
      };
    }),
    linked_shipments: linkedShipments.map((s) => ({
      shipment_id: s.shipment_id,
      shipment_number: s.shipment_number,
      current_status: s.current_status,
      coupled_at: s.coupled_at.toISOString(),
      coupled_by: s.coupled_by,
    })),
  };
}

export class PoIntakeService {
  constructor(
    private readonly repo: PoIntakeRepository,
    private readonly mappingRepo?: { findActiveShipmentsByIntakeId(intakeId: string): Promise<LinkedShipmentByIntake[]> },
    private readonly userRepo?: UserRepository
  ) {}

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
    const linkedShipments = this.mappingRepo ? await this.mappingRepo.findActiveShipmentsByIntakeId(id) : [];
    const takenByName = row.taken_by_user_id && this.userRepo
      ? (await this.userRepo.findById(row.taken_by_user_id))?.name ?? null
      : null;
    return toDetail(row, items, linkedShipments, takenByName);
  }

  async takeOwnership(id: string, userId: string): Promise<PoIntakeDetail | null> {
    const row = await this.repo.findById(id);
    if (!row) throw new AppError("PO intake not found", 404);
    if (row.intake_status === "GROUPED_TO_SHIPMENT") {
      const linkedShipments = this.mappingRepo ? await this.mappingRepo.findActiveShipmentsByIntakeId(id) : [];
      const allDelivered =
        linkedShipments.length > 0 &&
        linkedShipments.every((s) => s.current_status === "DELIVERED");
      if (!allDelivered) {
        throw new AppError("PO intake already grouped to a shipment", 409);
      }
    }
    const updated = await this.repo.takeOwnership(id, userId);
    if (!updated) return null;
    const items = await this.repo.findItemsByIntakeId(id);
    const linkedShipments = this.mappingRepo ? await this.mappingRepo.findActiveShipmentsByIntakeId(id) : [];
    const takenByName = updated.taken_by_user_id && this.userRepo
      ? (await this.userRepo.findById(updated.taken_by_user_id))?.name ?? null
      : null;
    return toDetail(updated, items, linkedShipments, takenByName);
  }

  /** Called by shipment service when coupling PO. */
  async setGroupedToShipment(intakeId: string): Promise<void> {
    await this.repo.setGroupedToShipment(intakeId);
  }
}
