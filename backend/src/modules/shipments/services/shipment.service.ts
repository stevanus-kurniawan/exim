/**
 * Shipment service: business logic. Create, monitor lifecycle, summary; couple/decouple PO.
 */

import { ShipmentRepository } from "../repositories/shipment.repository.js";
import { ShipmentPoMappingRepository } from "../repositories/shipment-po-mapping.repository.js";
import { ShipmentPoLineReceivedRepository } from "../repositories/shipment-po-line-received.repository.js";
import { PoIntakeRepository } from "../../po-intake/repositories/po-intake.repository.js";
import { AppError } from "../../../middlewares/errorHandler.js";
import type {
  CreateShipmentDto,
  UpdateShipmentDto,
  ListShipmentsQuery,
  ShipmentRow,
  ShipmentListItem,
  ShipmentDetail,
  CreateShipmentResponse,
  LinkedPoSummary,
} from "../dto/index.js";

const poIntakeRepo = new PoIntakeRepository();

function toListItem(row: ShipmentRow, linkedPoCount?: number): ShipmentListItem {
  return {
    id: row.id,
    shipment_number: row.shipment_no,
    supplier_name: row.vendor_name,
    origin_port_name: row.origin_port_name,
    destination_port_name: row.destination_port_name,
    current_status: row.current_status,
    eta: row.eta ? row.eta.toISOString().slice(0, 10) : null,
    linked_po_count: linkedPoCount,
  };
}

function toLinkedSummary(
  row: {
    intake_id: string;
    po_number: string;
    plant: string | null;
    supplier_name: string;
    incoterm_location: string | null;
    currency: string | null;
    invoice_no: string | null;
    currency_rate: number | null;
    coupled_at: Date;
    coupled_by: string;
  },
  lineReceived: { item_id: string; received_qty: number }[] = []
): LinkedPoSummary {
  return {
    intake_id: row.intake_id,
    po_number: row.po_number,
    plant: row.plant,
    supplier_name: row.supplier_name,
    incoterm_location: row.incoterm_location,
    currency: row.currency ?? null,
    invoice_no: row.invoice_no ?? null,
    currency_rate: row.currency_rate ?? null,
    coupled_at: row.coupled_at.toISOString(),
    coupled_by: row.coupled_by,
    line_received: lineReceived,
  };
}

const PPN_RATE = 0.11;
const PPH_RATE = 0.025;

function toDetail(row: ShipmentRow, linkedPos: LinkedPoSummary[], totalItemsAmount: number): ShipmentDetail {
  const bmAmount = row.bm ?? 0;
  const ppn = totalItemsAmount * PPN_RATE;
  const pph = totalItemsAmount * PPH_RATE;
  const pdri = bmAmount + ppn + pph;

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
    current_status: row.current_status,
    closed_at: row.closed_at ? row.closed_at.toISOString() : null,
    close_reason: row.close_reason,
    remarks: row.remarks,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    pib_type: row.pib_type ?? null,
    no_request_pib: row.no_request_pib ?? null,
    nopen: row.nopen ?? null,
    nopen_date: row.nopen_date ? row.nopen_date.toISOString().slice(0, 10) : null,
    ship_by: row.ship_by ?? null,
    bl_awb: row.bl_awb ?? null,
    insurance_no: row.insurance_no ?? null,
    coo: row.coo ?? null,
    incoterm_amount: row.incoterm_amount ?? null,
    bm: row.bm ?? null,
    bm_percentage: row.bm_percentage ?? null,
    kawasan_berikat: row.kawasan_berikat ?? null,
    total_items_amount: totalItemsAmount,
    ppn,
    pph,
    pdri,
    linked_pos: linkedPos,
  };
}

export class ShipmentService {
  constructor(
    private readonly repo: ShipmentRepository,
    private readonly mappingRepo: ShipmentPoMappingRepository,
    private readonly lineReceivedRepo?: ShipmentPoLineReceivedRepository
  ) {}

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
    const items: ShipmentListItem[] = [];
    for (const row of rows) {
      const count = await this.mappingRepo.countActiveByShipmentId(row.id);
      items.push(toListItem(row, count));
    }
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
    const intakeIds = linked.map((l) => l.intake_id);
    const totalItemsAmount = await poIntakeRepo.getTotalItemsAmountForIntakeIds(intakeIds);
    return toDetail(row, linkedPos, totalItemsAmount);
  }

  async update(id: string, dto: UpdateShipmentDto): Promise<ShipmentDetail | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    if (existing.closed_at) {
      throw new AppError("Cannot update a closed shipment", 409);
    }
    const row = await this.repo.update(id, dto);
    if (!row) return null;
    const linked = await this.mappingRepo.findActiveByShipmentId(id);
    const linkedPos = await Promise.all(
      linked.map(async (l) => {
        const lines = this.lineReceivedRepo ? await this.lineReceivedRepo.findByShipmentAndIntake(id, l.intake_id) : [];
        return toLinkedSummary(l, lines);
      })
    );
    const intakeIds = linked.map((l) => l.intake_id);
    const totalItemsAmount = await poIntakeRepo.getTotalItemsAmountForIntakeIds(intakeIds);
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

    for (const intakeId of intakeIds) {
      const intake = await poIntakeRepo.findById(intakeId);
      if (!intake) throw new AppError(`PO intake not found: ${intakeId}`, 404);
      if (intake.intake_status === "GROUPED_TO_SHIPMENT") {
        const already = await this.mappingRepo.isCoupled(shipmentId, intakeId);
        if (!already) throw new AppError(`PO intake ${intakeId} is already grouped to another shipment`, 409);
      }
      await this.mappingRepo.couple(shipmentId, intakeId, coupledBy);
      await poIntakeRepo.setGroupedToShipment(intakeId);
    }

    return this.getById(shipmentId);
  }

  async decouplePo(shipmentId: string, intakeId: string, decoupledBy: string, reason: string | null): Promise<void> {
    const shipment = await this.repo.findById(shipmentId);
    if (!shipment) throw new AppError("Shipment not found", 404);

    const updated = await this.mappingRepo.decouple(shipmentId, intakeId, decoupledBy, reason);
    if (!updated) throw new AppError("PO is not coupled to this shipment or already decoupled", 404);
    await poIntakeRepo.setBackToTaken(intakeId);
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

  /** Update received qty per line for a linked PO. Validates: total received across shipments ≤ 105% of PO line qty. */
  async updatePoLines(
    shipmentId: string,
    intakeId: string,
    lines: { item_id: string; received_qty: number }[]
  ): Promise<ShipmentDetail | null> {
    if (!this.lineReceivedRepo) throw new AppError("Line received repository not available", 500);
    const shipment = await this.repo.findById(shipmentId);
    if (!shipment) return null;
    const isCoupled = await this.mappingRepo.isCoupled(shipmentId, intakeId);
    if (!isCoupled) throw new AppError("PO is not coupled to this shipment", 404);
    const poItems = await poIntakeRepo.findItemsByIntakeId(intakeId);
    const poQtyByItem = new Map(poItems.map((i) => [i.id, i.qty ?? 0]));
    const maxAllowed = 1.05; // 105%
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
          `Total received qty for item ${line.item_id} cannot exceed ${maxAllowed * 100}% of PO qty (${poQty})`,
          400
        );
      }
    }
    await this.lineReceivedRepo.setLines(shipmentId, intakeId, lines);
    return this.getById(shipmentId);
  }
}
