/**
 * Shipment service: business logic. Create, monitor lifecycle, summary; couple/decouple PO.
 */

import { ShipmentRepository } from "../repositories/shipment.repository.js";
import { ShipmentPoMappingRepository } from "../repositories/shipment-po-mapping.repository.js";
import { ShipmentPoLineReceivedRepository } from "../repositories/shipment-po-line-received.repository.js";
import { PoIntakeRepository } from "../../po-intake/repositories/po-intake.repository.js";
import type { PoIntakeRow } from "../../po-intake/dto/index.js";

function normalizeGroupField(v: string | null | undefined): string {
  return (v ?? "").trim().toUpperCase();
}
import { AppError } from "../../../middlewares/errorHandler.js";
import { PPH_PERCENTAGE, PPN_PERCENTAGE } from "../../../config/tax-rates.js";
import type {
  CreateShipmentDto,
  UpdateShipmentDto,
  ListShipmentsQuery,
  ShipmentRow,
  ShipmentListItem,
  ShipmentListLinkedPo,
  ShipmentDetail,
  CreateShipmentResponse,
  LinkedPoSummary,
} from "../dto/index.js";
import { ShipmentUpdateLogRepository } from "../repositories/shipment-update-log.repository.js";
import { syncPoIntakeStatus } from "../../po-intake/services/po-intake-status-sync.service.js";

const poIntakeRepo = new PoIntakeRepository();

function collectUpdateShipmentFieldKeys(dto: UpdateShipmentDto): string[] {
  return (Object.keys(dto) as (keyof UpdateShipmentDto)[]).filter((k) => dto[k] !== undefined) as string[];
}

function normalizeFieldValue(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return String(value);
}

function collectUpdateFieldChanges(
  before: ShipmentRow,
  after: ShipmentRow,
  keys: string[]
): Array<{ field: string; before: string | null; after: string | null }> {
  const out: Array<{ field: string; before: string | null; after: string | null }> = [];
  const beforeRecord = before as unknown as Record<string, unknown>;
  const afterRecord = after as unknown as Record<string, unknown>;
  for (const key of keys) {
    const beforeValue = normalizeFieldValue(beforeRecord[key]);
    const afterValue = normalizeFieldValue(afterRecord[key]);
    if (beforeValue === afterValue) continue;
    out.push({ field: key, before: beforeValue, after: afterValue });
  }
  return out;
}

function toListItem(row: ShipmentRow, linkedPos: ShipmentListLinkedPo[]): ShipmentListItem {
  const first = linkedPos[0];
  const pic = linkedPos.find((p) => p.taken_by_name && p.taken_by_name.trim() !== "")?.taken_by_name ?? null;
  return {
    id: row.id,
    shipment_number: row.shipment_no,
    supplier_name: row.vendor_name,
    vendor_name: row.vendor_name,
    incoterm: row.incoterm ?? null,
    pib_type: row.pib_type ?? null,
    shipment_method: row.shipment_method ?? null,
    product_classification: row.product_classification ?? null,
    ship_by: row.ship_by ?? null,
    forwarder_name: row.forwarder_name,
    origin_port_name: row.origin_port_name,
    destination_port_name: row.destination_port_name,
    current_status: row.current_status,
    etd: row.etd ? row.etd.toISOString().slice(0, 10) : null,
    eta: row.eta ? row.eta.toISOString().slice(0, 10) : null,
    linked_po_count: linkedPos.length,
    pic_name: pic,
    display_pt: first?.pt ?? null,
    display_plant: first?.plant ?? null,
    closed_at: row.closed_at ? row.closed_at.toISOString() : null,
    linked_pos: linkedPos,
  };
}

function toLinkedSummary(
  row: {
    intake_id: string;
    po_number: string;
    pt: string | null;
    plant: string | null;
    supplier_name: string;
    incoterm_location: string | null;
    currency: string | null;
    invoice_no: string | null;
    currency_rate: number | null;
    taken_by_name: string | null;
    coupled_at: Date;
    coupled_by: string;
  },
  lineReceived: { item_id: string; received_qty: number }[] = []
): LinkedPoSummary {
  return {
    intake_id: row.intake_id,
    po_number: row.po_number,
    pt: row.pt,
    plant: row.plant,
    supplier_name: row.supplier_name,
    incoterm_location: row.incoterm_location,
    currency: row.currency ?? null,
    invoice_no: row.invoice_no ?? null,
    currency_rate: row.currency_rate ?? null,
    coupled_at: row.coupled_at.toISOString(),
    coupled_by: row.coupled_by,
    taken_by_name: row.taken_by_name ?? null,
    line_received: lineReceived,
  };
}

/** BM = (bm_percentage / 100) × total PO amount. Total PO = Σ(unit_price×qty). PPN/PPH from env. */
function computeBmPpnPphPdri(
  bmPercentage: number | null | undefined,
  totalItemsAmount: number
): { bm: number; ppn: number; pph: number; pdri: number } {
  const bmPct = bmPercentage ?? 0;
  const bmAmount = totalItemsAmount * (bmPct / 100);
  const base = totalItemsAmount + bmAmount;
  const ppn = base * (PPN_PERCENTAGE / 100);
  const pph = base * (PPH_PERCENTAGE / 100);
  const pdri = bmAmount + ppn + pph;
  return { bm: bmAmount, ppn, pph, pdri };
}

function toDetail(row: ShipmentRow, linkedPos: LinkedPoSummary[], totalItemsAmount: number): ShipmentDetail {
  const { bm: bmAmount, ppn, pph, pdri } = computeBmPpnPphPdri(row.bm_percentage, totalItemsAmount);
  const pic = linkedPos.find((p) => p.taken_by_name && p.taken_by_name.trim() !== "")?.taken_by_name ?? null;

  return {
    id: row.id,
    shipment_number: row.shipment_no,
    vendor_code: row.vendor_code,
    vendor_name: row.vendor_name,
    forwarder_code: row.forwarder_code,
    forwarder_name: row.forwarder_name,
    warehouse_code: row.warehouse_code,
    warehouse_name: row.warehouse_name,
    incoterm: row.incoterm,
    shipment_method: row.shipment_method,
    origin_port_code: row.origin_port_code,
    origin_port_name: row.origin_port_name,
    origin_port_country: row.origin_port_country,
    destination_port_code: row.destination_port_code,
    destination_port_name: row.destination_port_name,
    destination_port_country: row.destination_port_country,
    etd: row.etd ? row.etd.toISOString() : null,
    eta: row.eta ? row.eta.toISOString().slice(0, 10) : null,
    atd: row.atd ? row.atd.toISOString() : null,
    ata: row.ata ? row.ata.toISOString() : null,
    depo: row.depo,
    depo_location: row.depo_location ?? null,
    current_status: row.current_status,
    closed_at: row.closed_at ? row.closed_at.toISOString() : null,
    close_reason: row.close_reason,
    remarks: row.remarks,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    pic_name: pic,
    pib_type: row.pib_type ?? null,
    no_request_pib: row.no_request_pib ?? null,
    nopen: row.nopen ?? null,
    nopen_date: row.nopen_date ? row.nopen_date.toISOString().slice(0, 10) : null,
    ship_by: row.ship_by ?? null,
    bl_awb: row.bl_awb ?? null,
    insurance_no: row.insurance_no ?? null,
    coo: row.coo ?? null,
    incoterm_amount: row.incoterm_amount ?? null,
    cbm: row.cbm ?? null,
    net_weight_mt: row.net_weight_mt ?? null,
    gross_weight_mt: row.gross_weight_mt ?? null,
    bm: bmAmount,
    bm_percentage: row.bm_percentage ?? null,
    kawasan_berikat: row.kawasan_berikat ?? null,
    surveyor: row.surveyor ?? null,
    product_classification: row.product_classification ?? null,
    unit_20ft: row.unit_20ft ?? false,
    unit_40ft: row.unit_40ft ?? false,
    unit_package: row.unit_package ?? false,
    unit_20_iso_tank: row.unit_20_iso_tank ?? false,
    container_count_20ft: row.container_count_20ft ?? null,
    container_count_40ft: row.container_count_40ft ?? null,
    package_count: row.package_count ?? null,
    container_count_20_iso_tank: row.container_count_20_iso_tank ?? null,
    total_items_amount: totalItemsAmount,
    ppn_percentage: PPN_PERCENTAGE,
    ppn,
    pph_percentage: PPH_PERCENTAGE,
    pph,
    pdri,
    linked_pos: linkedPos,
  };
}

export class ShipmentService {
  constructor(
    private readonly repo: ShipmentRepository,
    private readonly mappingRepo: ShipmentPoMappingRepository,
    private readonly lineReceivedRepo?: ShipmentPoLineReceivedRepository,
    private readonly updateLogRepo: ShipmentUpdateLogRepository = new ShipmentUpdateLogRepository()
  ) {}

  private async getShipmentTotalPoAmountIdr(
    shipmentId: string,
    linked: Array<{ intake_id: string; currency_rate: number | null; currency: string | null }>
  ): Promise<number> {
    if (!this.lineReceivedRepo || linked.length === 0) return 0;
    let total = 0;
    for (const po of linked) {
      const items = await poIntakeRepo.findItemsByIntakeId(po.intake_id);
      const unitPriceByItem = new Map(items.map((it) => [it.id, Number(it.value ?? 0)]));
      const received = await this.lineReceivedRepo.findByShipmentAndIntake(shipmentId, po.intake_id);
      const poSubtotal = received.reduce((sum, line) => {
        const unitPrice = unitPriceByItem.get(line.item_id) ?? 0;
        const deliveredQty = Number(line.received_qty ?? 0);
        const price = Number.isFinite(unitPrice) ? unitPrice : 0;
        const qty = Number.isFinite(deliveredQty) ? deliveredQty : 0;
        return sum + price * qty;
      }, 0);
      const isIdr = (po.currency ?? "").trim().toUpperCase() === "IDR";
      const rate = isIdr
        ? 1
        : po.currency_rate != null && Number.isFinite(po.currency_rate)
          ? po.currency_rate
          : 1;
      total += poSubtotal * rate;
    }
    return total;
  }

  /** Persist computed BM = (bm_percentage / 100) × sum(linked PO line amounts). */
  private async syncComputedBmToDb(shipmentId: string): Promise<void> {
    const row = await this.repo.findById(shipmentId);
    if (!row) return;
    const linked = await this.mappingRepo.findActiveByShipmentId(shipmentId);
    const total = await this.getShipmentTotalPoAmountIdr(
      shipmentId,
      linked.map((l) => ({ intake_id: l.intake_id, currency_rate: l.currency_rate, currency: l.currency }))
    );
    const { bm: computedBm } = computeBmPpnPphPdri(row.bm_percentage, total);
    await this.repo.updateComputedBm(shipmentId, computedBm);
  }

  async create(dto: CreateShipmentDto): Promise<CreateShipmentResponse> {
    const year = new Date().getFullYear();
    const shipmentNo = await this.repo.getNextShipmentNo(year);
    const row = await this.repo.create(dto, shipmentNo);
    return {
      id: row.id,
      shipment_number: row.shipment_no,
      current_status: row.current_status,
      created_at: row.created_at.toISOString(),
    };
  }

  async list(query: ListShipmentsQuery): Promise<{ items: ShipmentListItem[]; total: number }> {
    const { rows, total } = await this.repo.findAll(query);
    const ids = rows.map((r) => r.id);
    const byShipment = await this.mappingRepo.findActiveLinkedPosWithItemsByShipmentIds(ids);
    const items = rows.map((row) => toListItem(row, byShipment.get(row.id) ?? []));
    return { items, total };
  }

  async getById(id: string): Promise<ShipmentDetail | null> {
    const row = await this.repo.findById(id);
    if (!row) return null;
    const linked = await this.mappingRepo.findActiveByShipmentId(id);
    const linkedPos = await Promise.all(
      linked.map(async (l) => {
        const lines = this.lineReceivedRepo ? await this.lineReceivedRepo.findByShipmentAndIntake(id, l.intake_id) : [];
        return toLinkedSummary(l, lines);
      })
    );
    const totalItemsAmount = await this.getShipmentTotalPoAmountIdr(
      id,
      linked.map((l) => ({ intake_id: l.intake_id, currency_rate: l.currency_rate, currency: l.currency }))
    );
    return toDetail(row, linkedPos, totalItemsAmount);
  }

  async update(id: string, dto: UpdateShipmentDto, changedBy?: string): Promise<ShipmentDetail | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    if (existing.closed_at) {
      throw new AppError("Cannot update a closed shipment", 409);
    }
    const beforeUpdatedAt = existing.updated_at.getTime();
    const row = await this.repo.update(id, dto);
    if (!row) return null;
    const keys = collectUpdateShipmentFieldKeys(dto);
    const fieldChanges = collectUpdateFieldChanges(existing, row, keys);
    if (fieldChanges.length > 0 && changedBy && row.updated_at.getTime() > beforeUpdatedAt) {
      await this.updateLogRepo.create({
        shipmentId: id,
        changedBy,
        fieldsChanged: fieldChanges.map((x) => x.field),
        fieldChanges,
      });
    }
    await this.syncComputedBmToDb(id);
    const linked = await this.mappingRepo.findActiveByShipmentId(id);
    const linkedPos = await Promise.all(
      linked.map(async (l) => {
        const lines = this.lineReceivedRepo ? await this.lineReceivedRepo.findByShipmentAndIntake(id, l.intake_id) : [];
        return toLinkedSummary(l, lines);
      })
    );
    const totalItemsAmount = await this.getShipmentTotalPoAmountIdr(
      id,
      linked.map((l) => ({ intake_id: l.intake_id, currency_rate: l.currency_rate, currency: l.currency }))
    );
    return toDetail(row, linkedPos, totalItemsAmount);
  }

  async close(id: string, reason: string | null): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new AppError("Shipment not found", 404);
    if (existing.closed_at) throw new AppError("Shipment is already closed", 409);
    await this.repo.close(id, reason);
  }

  async couplePo(shipmentId: string, intakeIds: string[], coupledBy: string): Promise<ShipmentDetail | null> {
    const shipment = await this.repo.findById(shipmentId);
    if (!shipment) throw new AppError("Shipment not found", 404);
    if (shipment.closed_at) throw new AppError("Cannot couple PO to a closed shipment", 409);

    const uniqueIds = [...new Set(intakeIds)];
    const existing = await this.mappingRepo.findActiveByShipmentId(shipmentId);
    const incoming: PoIntakeRow[] = [];
    for (const intakeId of uniqueIds) {
      const intake = await poIntakeRepo.findById(intakeId);
      if (!intake) throw new AppError(`PO intake not found: ${intakeId}`, 404);
      incoming.push(intake);
    }

    if (incoming.length > 0) {
      if (existing.length > 0) {
        const ref = existing[0]!;
        const refInco = normalizeGroupField(ref.incoterm_location);
        const refCur = normalizeGroupField(ref.currency);
        for (const intake of incoming) {
          if (normalizeGroupField(intake.incoterm_location) !== refInco) {
            throw new AppError(
              `PO ${intake.po_number}: incoterm must match this shipment group (${ref.incoterm_location ?? "—"}).`,
              400
            );
          }
          if (normalizeGroupField(intake.currency) !== refCur) {
            throw new AppError(
              `PO ${intake.po_number}: currency must match this shipment group (${ref.currency ?? "—"}).`,
              400
            );
          }
        }
      } else {
        const shipInco = normalizeGroupField(shipment.incoterm);
        const first = incoming[0]!;
        const baseInco = normalizeGroupField(first.incoterm_location);
        const baseCur = normalizeGroupField(first.currency);
        if (shipInco && baseInco !== shipInco) {
          throw new AppError(
            `PO ${first.po_number}: incoterm must match shipment incoterm (${shipment.incoterm ?? "—"}).`,
            400
          );
        }
        for (const intake of incoming) {
          if (normalizeGroupField(intake.incoterm_location) !== baseInco) {
            throw new AppError(
              `All POs in one group must share the same incoterm (see ${first.po_number}).`,
              400
            );
          }
          if (normalizeGroupField(intake.currency) !== baseCur) {
            throw new AppError(
              `All POs in one group must share the same currency (see ${first.po_number}).`,
              400
            );
          }
        }
      }
    }

    for (const intakeId of uniqueIds) {
      await this.mappingRepo.couple(shipmentId, intakeId, coupledBy);
      await syncPoIntakeStatus(intakeId);
    }

    await this.syncComputedBmToDb(shipmentId);
    return this.getById(shipmentId);
  }

  async decouplePo(shipmentId: string, intakeId: string, decoupledBy: string, reason: string | null): Promise<void> {
    const shipment = await this.repo.findById(shipmentId);
    if (!shipment) throw new AppError("Shipment not found", 404);

    const updated = await this.mappingRepo.decouple(shipmentId, intakeId, decoupledBy, reason);
    if (!updated) throw new AppError("PO is not coupled to this shipment or already decoupled", 404);
    await syncPoIntakeStatus(intakeId);
    await this.syncComputedBmToDb(shipmentId);
  }

  /** Update invoice_no and/or currency_rate for a linked PO. */
  async updatePoMapping(
    shipmentId: string,
    intakeId: string,
    data: { invoice_no?: string | null; currency_rate?: number | null }
  ): Promise<ShipmentDetail | null> {
    const shipment = await this.repo.findById(shipmentId);
    if (!shipment) return null;
    const updated = await this.mappingRepo.updateMapping(shipmentId, intakeId, data);
    if (!updated) return null;
    return this.getById(shipmentId);
  }

  /**
   * Update delivered qty per line for a linked PO.
   * Totals for Bulk validation sum `received_qty` for this PO line across every **active** shipment–PO link
   * (same intake, mapping not decoupled). Shipment lifecycle status does not matter — in-progress and delivered
   * shipments both contribute.
   * When Ship by is Bulk only: that total ≤ PO line qty + 5% (105%). No PO-qty cap for LCL, FCL, or unset Ship by.
   */
  async updatePoLines(
    shipmentId: string,
    intakeId: string,
    lines: {
      item_id: string;
      received_qty: number;
    }[]
  ): Promise<ShipmentDetail | null> {
    if (!this.lineReceivedRepo) throw new AppError("Line received repository not available", 500);
    const shipment = await this.repo.findById(shipmentId);
    if (!shipment) return null;
    const isCoupled = await this.mappingRepo.isCoupled(shipmentId, intakeId);
    if (!isCoupled) throw new AppError("PO is not coupled to this shipment", 404);
    const poItems = await poIntakeRepo.findItemsByIntakeId(intakeId);
    const poQtyByItem = new Map(poItems.map((i) => [i.id, i.qty ?? 0]));
    const shipBy = (shipment.ship_by ?? "").trim();
    if (shipBy === "Bulk") {
      const maxAllowed = 1.05; // 5% over PO qty
      for (const line of lines) {
        const poQty = poQtyByItem.get(line.item_id) ?? 0;
        const totalSoFar = await this.lineReceivedRepo.getTotalReceivedByIntakeItem(intakeId, line.item_id);
        const currentForThisShipment = (await this.lineReceivedRepo.findByShipmentAndIntake(shipmentId, intakeId)).find(
          (l) => l.item_id === line.item_id
        )?.received_qty ?? 0;
        const otherShipmentsTotal = totalSoFar - currentForThisShipment;
        const newTotal = otherShipmentsTotal + line.received_qty;
        if (poQty > 0 && newTotal > poQty * maxAllowed) {
          throw new AppError(
            `Total delivered qty for item ${line.item_id} cannot exceed PO qty by more than 5% (max ${maxAllowed * 100}% of PO qty, PO qty = ${poQty})`,
            400
          );
        }
      }
    }
    await this.lineReceivedRepo.setLines(
      shipmentId,
      intakeId,
      lines.map(({ item_id, received_qty }) => ({ item_id, received_qty }))
    );
    for (const line of lines) {
      await poIntakeRepo.recomputeTotalAmountItemByLine(intakeId, line.item_id);
    }
    await syncPoIntakeStatus(intakeId);
    return this.getById(shipmentId);
  }
}
