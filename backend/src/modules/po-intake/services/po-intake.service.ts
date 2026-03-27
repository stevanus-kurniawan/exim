/**
 * PO intake service: business logic. Store ingested PO, prevent duplicates, track status, assignment.
 */

import { PoIntakeRepository } from "../repositories/po-intake.repository.js";
import { ShipmentPoLineReceivedRepository } from "../../shipments/repositories/shipment-po-line-received.repository.js";
import type { LinkedShipmentByIntake } from "../../shipments/repositories/shipment-po-mapping.repository.js";
import type { UserRepository } from "../../auth/repositories/user.repository.js";
import { AppError } from "../../../middlewares/errorHandler.js";
import { syncPoIntakeStatus } from "./po-intake-status-sync.service.js";
import type {
  CreatePoIntakeDto,
  ListPoIntakeQuery,
  PoIntakeRow,
  PoIntakeItemRow,
  PoIntakeListItem,
  PoIntakeDetail,
  CreatePoIntakeResponse,
} from "../dto/index.js";

function toListItem(row: PoIntakeRow & { taken_by_name?: string | null }): PoIntakeListItem {
  return {
    id: row.id,
    external_id: row.external_id,
    po_number: row.po_number,
    plant: row.plant,
    pt: row.pt,
    supplier_name: row.supplier_name,
    delivery_location: row.delivery_location,
    incoterm_location: row.incoterm_location,
    kawasan_berikat: row.kawasan_berikat ?? null,
    currency: row.currency ?? null,
    intake_status: row.intake_status,
    taken_by_user_id: row.taken_by_user_id ?? null,
    taken_by_name: row.taken_by_name ?? null,
    taken_at: row.taken_at ? row.taken_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

async function buildDetail(
  lineReceivedRepo: ShipmentPoLineReceivedRepository,
  row: PoIntakeRow,
  items: PoIntakeItemRow[],
  linkedShipments: LinkedShipmentByIntake[],
  takenByName: string | null,
  overshipped: boolean
): Promise<PoIntakeDetail> {
  const itemsOut = await Promise.all(
    items.map(async (it) => {
      const qty = it.qty ?? 0;
      const receivedQty = await lineReceivedRepo.getTotalReceivedByIntakeItem(row.id, it.id);
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
        received_qty: receivedQty,
        remaining_qty: remainingQty,
        over_received_pct: overReceivedPct,
      };
    })
  );

  const linkedShipmentsOut = await Promise.all(
    linkedShipments.map(async (s) => {
      const lineRows = await lineReceivedRepo.findByShipmentAndIntake(s.shipment_id, row.id);
      const byItemId = new Map(lineRows.map((r) => [r.item_id, r.received_qty]));
      const lines_received = items.map((it) => ({
        item_id: it.id,
        line_number: it.line_number,
        item_description: it.item_description,
        received_qty: byItemId.get(it.id) ?? 0,
      }));
      return {
        shipment_id: s.shipment_id,
        shipment_number: s.shipment_number,
        current_status: s.current_status,
        incoterm: s.incoterm ?? null,
        coupled_at: s.coupled_at.toISOString(),
        coupled_by: s.coupled_by,
        atd: s.atd ? s.atd.toISOString() : null,
        ata: s.ata ? s.ata.toISOString() : null,
        delivered_at: s.closed_at ? s.closed_at.toISOString() : null,
        lines_received,
      };
    })
  );

  return {
    id: row.id,
    external_id: row.external_id,
    po_number: row.po_number,
    plant: row.plant,
    pt: row.pt,
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
    items: itemsOut,
    linked_shipments: linkedShipmentsOut,
    overshipped,
  };
}

export class PoIntakeService {
  private readonly lineReceivedRepo = new ShipmentPoLineReceivedRepository();

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
    const dupPo = await this.repo.existsByPoNumberTrimmed(dto.po_number);
    if (dupPo) {
      throw new AppError("Purchase Order number already exists. PO numbers must be unique.", 409);
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

  async list(query: ListPoIntakeQuery): Promise<{ items: PoIntakeListItem[]; total: number }> {
    const { rows, total } = await this.repo.findAll(query);
    await Promise.all(
      rows.map(async (r) => {
        const { status } = await syncPoIntakeStatus(r.id);
        r.intake_status = status;
      })
    );
    return { items: rows.map(toListItem), total };
  }

  async getById(id: string): Promise<PoIntakeDetail | null> {
    const row = await this.repo.findById(id);
    if (!row) return null;
    const { overshipped } = await syncPoIntakeStatus(id);
    const updated = await this.repo.findById(id);
    if (!updated) return null;
    const items = await this.repo.findItemsByIntakeId(id);
    const linkedShipments = this.mappingRepo ? await this.mappingRepo.findActiveShipmentsByIntakeId(id) : [];
    const takenByName =
      updated.taken_by_user_id && this.userRepo
        ? (await this.userRepo.findById(updated.taken_by_user_id))?.name ?? null
        : null;
    return buildDetail(this.lineReceivedRepo, updated, items, linkedShipments, takenByName, overshipped);
  }

  async takeOwnership(id: string, userId: string): Promise<PoIntakeDetail | null> {
    const row = await this.repo.findById(id);
    if (!row) throw new AppError("PO intake not found", 404);

    if (row.intake_status !== "NEW_PO_DETECTED") {
      const linkedShipments = this.mappingRepo ? await this.mappingRepo.findActiveShipmentsByIntakeId(id) : [];
      const allDelivered =
        linkedShipments.length > 0 &&
        linkedShipments.every((s) => s.current_status === "DELIVERED");
      const items = await this.repo.findItemsByIntakeId(id);
      let totalReceived = 0;
      let totalPoQty = 0;
      for (const it of items) {
        totalPoQty += it.qty ?? 0;
        totalReceived += await this.lineReceivedRepo.getTotalReceivedByIntakeItem(id, it.id);
      }
      const hasRemaining = totalPoQty > 0 && totalReceived < totalPoQty;
      if (!allDelivered || !hasRemaining) {
        throw new AppError("PO intake not available for claim", 409);
      }
    }

    const updated = await this.repo.takeOwnership(id, userId);
    if (!updated) return null;
    const { overshipped } = await syncPoIntakeStatus(id);
    const rowAfter = await this.repo.findById(id);
    if (!rowAfter) return null;
    const items = await this.repo.findItemsByIntakeId(id);
    const linkedShipments = this.mappingRepo ? await this.mappingRepo.findActiveShipmentsByIntakeId(id) : [];
    const takenByName =
      rowAfter.taken_by_user_id && this.userRepo
        ? (await this.userRepo.findById(rowAfter.taken_by_user_id))?.name ?? null
        : null;
    return buildDetail(this.lineReceivedRepo, rowAfter, items, linkedShipments, takenByName, overshipped);
  }
}
