/**
 * Shipment service: business logic. Create, monitor lifecycle, summary; couple/decouple PO.
 */

import { ShipmentRepository } from "../repositories/shipment.repository.js";
import { ShipmentPoMappingRepository } from "../repositories/shipment-po-mapping.repository.js";
import { ShipmentPoLineReceivedRepository } from "../repositories/shipment-po-line-received.repository.js";
import { ShipmentStatusHistoryRepository } from "../repositories/shipment-status-history.repository.js";
import { PoIntakeRepository } from "../../po-intake/repositories/po-intake.repository.js";
import type { PoIntakeRow } from "../../po-intake/dto/index.js";

function normalizeGroupField(v: string | null | undefined): string {
  return (v ?? "").trim().toUpperCase();
}

/** YYYY-MM-DD from DB Date or ISO-ish string; null if missing/invalid. */
function shipmentDateToYmd(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (!s) return null;
  const y = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(y) ? y : null;
}

/** True when PO currency is IDR (sum PO amounts as-is; no FX). */
function isPoCurrencyIdr(currency: string | null | undefined): boolean {
  const c = normalizeGroupField(currency);
  return c === "IDR" || c === "RP";
}
import { AppError } from "../../../middlewares/errorHandler.js";
import { PPH_PERCENTAGE, PPN_PERCENTAGE } from "../../../config/tax-rates.js";
import type {
  CreateShipmentDto,
  ShipmentCsvImportErrorRow,
  ShipmentCsvImportResult,
  UpdateShipmentDto,
  ListShipmentsQuery,
  ShipmentListFilterOptions,
  ShipmentRow,
  ShipmentListItem,
  ShipmentListLinkedPo,
  ShipmentDetail,
  CreateShipmentResponse,
  LinkedPoSummary,
} from "../dto/index.js";
import { ShipmentUpdateLogRepository } from "../repositories/shipment-update-log.repository.js";
import { syncPoIntakeStatus } from "../../po-intake/services/po-intake-status-sync.service.js";
import { normalizeProductClassificationForApi } from "../../../shared/product-classification.js";
import { isPibTypeBc23 } from "../../../shared/pib-type.js";
import { isAtOrPastCustomsClearance } from "../utils/shipment-status-requirements.js";

const poIntakeRepo = new PoIntakeRepository();

const SHIPMENT_COMBINED_CSV_HEADERS = [
  "shipment_no",
  "po_number",
  "line_number",
  "received_qty",
  "vendor_name",
  "forwarder_name",
  "pt",
  "plant",
  "incoterm",
  "shipment_method",
  "origin_port_name",
  "origin_port_country",
  "destination_port_name",
  "destination_port_country",
  "etd",
  "eta",
  "atd",
  "ata",
  "product_classification",
  "pib_type",
  "no_request_pib",
  "nopen",
  "nopen_date",
  "bl_awb",
  "insurance_no",
  "coo",
  "cbm",
  "incoterm_amount",
  "net_weight_mt",
  "gross_weight_mt",
  "total_po_amount",
  "bm_percentage",
  "ppn_percentage",
  "pph_percentage",
  "delivered_at",
  "currency",
  "invoice_no",
  "currency_rate",
  "remarks",
] as const;

function parseCsvLine(line: string, delimiter: "," | ";"): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && c === delimiter) {
      result.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

/** Prefer semicolon when Excel (EU/ID locale) exports CSV; otherwise comma. */
function detectCsvDelimiter(headerLine: string): "," | ";" {
  const commaCols = parseCsvLine(headerLine, ",").length;
  const semiCols = parseCsvLine(headerLine, ";").length;
  if (semiCols > commaCols) return ";";
  return ",";
}

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, "");
}

function parseOptionalNumber(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Parses numbers from Excel/locale exports: thousands commas, EU-style dots, scientific notation. */
function parseInternationalNumber(text: string): number | undefined {
  let t = text.trim();
  if (!t) return undefined;
  if (/e/i.test(t)) {
    t = t.replace(/,/g, ".");
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma > lastDot) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    const dotParts = t.split(".");
    if (dotParts.length > 2) t = t.replace(/\./g, "");
    else t = t.replace(/,/g, "");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function isValidDateString(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  const dm = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dm) {
    const d = parseInt(dm[1]!, 10);
    const mo = parseInt(dm[2]!, 10) - 1;
    const y = parseInt(dm[3]!, 10);
    const dt = new Date(y, mo, d);
    return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d;
  }
  const d = new Date(t);
  return !isNaN(d.getTime());
}

/** Normalise d/m/y to yyyy-mm-dd for DB-safe date fields. */
function normalizeCsvDateToApi(s: string): string {
  const t = s.trim();
  const dm = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dm) {
    const d = parseInt(dm[1]!, 10);
    const mo = parseInt(dm[2]!, 10);
    const y = parseInt(dm[3]!, 10);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return t;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return t;
}

function buildRemarksWithTotalPo(base: string | undefined, totalPoRaw: string): string | undefined {
  const baseTrim = (base ?? "").trim();
  const t = totalPoRaw.trim();
  if (!t) return baseTrim || undefined;
  const suffix = `CSV total_po_amount: ${t}`;
  if (!baseTrim) return suffix;
  return `${baseTrim} | ${suffix}`;
}

function combinedRowToCreateDto(sf: UpdateShipmentDto): CreateShipmentDto {
  return {
    vendor_name: sf.vendor_name,
    forwarder_name: sf.forwarder_name,
    incoterm: sf.incoterm,
    shipment_method: sf.shipment_method,
    origin_port_name: sf.origin_port_name,
    origin_port_country: sf.origin_port_country,
    destination_port_name: sf.destination_port_name,
    destination_port_country: sf.destination_port_country,
    etd: sf.etd,
    eta: sf.eta,
    remarks: sf.remarks,
    pib_type: sf.pib_type,
    no_request_pib: sf.no_request_pib,
    ppjk_mkl: sf.ppjk_mkl,
    nopen: sf.nopen,
    nopen_date: sf.nopen_date,
    bl_awb: sf.bl_awb,
    insurance_no: sf.insurance_no,
    coo: sf.coo,
    incoterm_amount: sf.incoterm_amount,
    cbm: sf.cbm,
    bm_percentage: sf.bm_percentage,
    ppn_percentage: sf.ppn_percentage,
    pph_percentage: sf.pph_percentage,
    product_classification: sf.product_classification ?? undefined,
  };
}

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
    product_classification: normalizeProductClassificationForApi(row.product_classification),
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
  lineReceived: { item_id: string; received_qty: number; item_description?: string | null }[] = []
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
    line_received: lineReceived.map((l) => ({
      item_id: l.item_id,
      received_qty: l.received_qty,
      item_description: l.item_description ?? null,
    })),
  };
}

/** BM / PPN / PPH from shipment %; PPN/PPH fall back to env when row is null. */
function computeBmPpnPphPdri(
  bmPercentage: number | null | undefined,
  totalItemsAmount: number,
  pibType: string | null | undefined,
  ppnPctRow: number | null | undefined,
  pphPctRow: number | null | undefined
): { bm: number; ppn: number; pph: number; pdri: number } {
  if (isPibTypeBc23(pibType)) {
    return { bm: 0, ppn: 0, pph: 0, pdri: 0 };
  }
  const bmPct = bmPercentage ?? 0;
  const bmAmount = totalItemsAmount * (bmPct / 100);
  const base = totalItemsAmount + bmAmount;
  const ppnRate = ppnPctRow ?? PPN_PERCENTAGE;
  const pphRate = pphPctRow ?? PPH_PERCENTAGE;
  const ppn = base * (ppnRate / 100);
  const pph = base * (pphRate / 100);
  const pdri = bmAmount + ppn + pph;
  return { bm: bmAmount, ppn, pph, pdri };
}

function toDetail(row: ShipmentRow, linkedPos: LinkedPoSummary[], totalItemsAmount: number): ShipmentDetail {
  const { bm: bmAmount, ppn, pph, pdri } = computeBmPpnPphPdri(
    row.bm_percentage,
    totalItemsAmount,
    row.pib_type,
    row.ppn_percentage,
    row.pph_percentage
  );
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
    ppjk_mkl: row.ppjk_mkl ?? null,
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
    ppn_percentage: row.ppn_percentage ?? null,
    pph_percentage: row.pph_percentage ?? null,
    duty_percentage_defaults: { ppn: PPN_PERCENTAGE, pph: PPH_PERCENTAGE },
    kawasan_berikat: row.kawasan_berikat ?? null,
    surveyor: row.surveyor ?? null,
    product_classification: normalizeProductClassificationForApi(row.product_classification),
    unit_20ft: row.unit_20ft ?? false,
    unit_40ft: row.unit_40ft ?? false,
    unit_package: row.unit_package ?? false,
    unit_20_iso_tank: row.unit_20_iso_tank ?? false,
    container_count_20ft: row.container_count_20ft ?? null,
    container_count_40ft: row.container_count_40ft ?? null,
    package_count: row.package_count ?? null,
    container_count_20_iso_tank: row.container_count_20_iso_tank ?? null,
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
    private readonly lineReceivedRepo?: ShipmentPoLineReceivedRepository,
    private readonly updateLogRepo: ShipmentUpdateLogRepository = new ShipmentUpdateLogRepository(),
    private readonly statusHistoryRepo: ShipmentStatusHistoryRepository = new ShipmentStatusHistoryRepository()
  ) {}

  /**
   * Total invoice in IDR for the shipment. Linked POs share one currency and one FX rate (enforced when coupling).
   * IDR/RP: Σ(delivered_qty × unit_price) across all POs.
   * Other: same sum in PO currency × single group currency_rate (read from any mapping row; identical per business rule).
   */
  private async getShipmentTotalPoAmountIdr(
    shipmentId: string,
    linked: Array<{ intake_id: string; currency_rate: number | null; currency: string | null }>
  ): Promise<number> {
    if (!this.lineReceivedRepo || linked.length === 0) return 0;

    let sumInPoCurrency = 0;
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
      sumInPoCurrency += poSubtotal;
    }

    const groupCurrency = linked[0]?.currency;
    if (isPoCurrencyIdr(groupCurrency)) {
      return sumInPoCurrency;
    }

    let groupRate: number | null = null;
    for (const po of linked) {
      const r = po.currency_rate != null ? Number(po.currency_rate) : NaN;
      if (Number.isFinite(r) && r > 0) {
        groupRate = r;
        break;
      }
    }
    return sumInPoCurrency * (groupRate ?? 1);
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
    const { bm: computedBm } = computeBmPpnPphPdri(
      row.bm_percentage,
      total,
      row.pib_type,
      row.ppn_percentage,
      row.pph_percentage
    );
    await this.repo.updateComputedBm(shipmentId, computedBm);
  }

  /**
   * @param initialStatusActor — shown on timeline for INITIATE_SHIPPING_DOCUMENT (e.g. user who created shipment from PO claim).
   */
  async create(dto: CreateShipmentDto, initialStatusActor?: string): Promise<CreateShipmentResponse> {
    const etdC = dto.etd?.trim().slice(0, 10);
    const etaC = dto.eta?.trim().slice(0, 10);
    if (
      etdC &&
      etaC &&
      /^\d{4}-\d{2}-\d{2}$/.test(etdC) &&
      /^\d{4}-\d{2}-\d{2}$/.test(etaC) &&
      etaC <= etdC
    ) {
      throw new AppError("ETA must be after ETD", 400, [
        { field: "eta", message: "ETA must be a date after ETD" },
      ]);
    }
    const year = new Date().getFullYear();
    const shipmentNo = await this.repo.getNextShipmentNo(year);
    const row = await this.repo.create(dto, shipmentNo);
    const actor = (initialStatusActor ?? "System").trim() || "System";
    await this.statusHistoryRepo.create({
      shipmentId: row.id,
      previousStatus: null,
      newStatus: "INITIATE_SHIPPING_DOCUMENT",
      remarks: null,
      changedBy: actor,
    });
    return {
      id: row.id,
      shipment_number: row.shipment_no,
      current_status: row.current_status,
      created_at: row.created_at.toISOString(),
    };
  }

  getCombinedImportTemplateCsv(): string {
    return `${SHIPMENT_COMBINED_CSV_HEADERS.join(",")}
SHP-TRIAL-0001,PO-0001,1,100,PT Supplier A,DHL,PT Demo,Plant Merak,FOB,SEA,Shanghai,China,Tanjung Priok,Indonesia,2026-04-02,2026-04-10,,,HS3208,Lartas,PIB-REQ-001,NOP-001,2026-04-05,BL123456,INS-001,ID,12.5,500,1.2,1.5,125000000,10,11,2.5,,IDR,INV-001,16250,Trial import
SHP-TRIAL-0001,PO-0002,1,50,PT Supplier A,DHL,PT Demo,Plant Merak,FOB,SEA,Shanghai,China,Tanjung Priok,Indonesia,2026-04-02,2026-04-10,,,HS3208,Lartas,PIB-REQ-001,NOP-001,2026-04-05,BL123456,INS-001,ID,12.5,500,1.2,1.5,125000000,10,11,2.5,,IDR,INV-002,16250,Trial import
`;
  }

  async importCombinedFromCsv(csvText: string): Promise<ShipmentCsvImportResult> {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) throw new AppError("CSV must include a header row and at least one data row", 400);

    const delim = detectCsvDelimiter(stripBom(lines[0]!));
    const header = parseCsvLine(stripBom(lines[0]!), delim).map((h) => h.trim().toLowerCase());
    const missingHeaders = SHIPMENT_COMBINED_CSV_HEADERS.filter((h) => !header.includes(h));
    if (missingHeaders.length > 0) {
      throw new AppError(
        `Missing required CSV header(s): ${missingHeaders.join(", ")}. ` +
          `Use the exact column names (see template). Files from Excel often use ";" instead of "," between columns — that is supported automatically.`,
        400
      );
    }
    const idx = (k: (typeof SHIPMENT_COMBINED_CSV_HEADERS)[number]) => header.indexOf(k);

    const errors: ShipmentCsvImportErrorRow[] = [];
    const byShipment = new Map<
      string,
      Array<{
        row: number;
        shipment_no: string;
        po_number: string;
        line_number: number;
        received_qty: number;
        invoice_no?: string;
        currency_rate?: number;
        currency?: string;
        pt?: string;
        plant?: string;
        shipment_fields: UpdateShipmentDto;
      }>
    >();

    let skippedEmptyBodyRows = 0;
    for (let i = 1; i < lines.length; i++) {
      const row = i + 1;
      const cells = parseCsvLine(lines[i]!, delim);
      const shipmentNo = (cells[idx("shipment_no")] ?? "").trim();
      const poNumber = (cells[idx("po_number")] ?? "").trim();
      if (!shipmentNo && !poNumber) {
        const anyValue = cells.some((c) => c.trim().length > 0);
        if (!anyValue) {
          skippedEmptyBodyRows += 1;
          continue;
        }
      }
      const lineNoParsed = parseInternationalNumber((cells[idx("line_number")] ?? "").trim());
      const lineNoRaw = lineNoParsed != null && Number.isInteger(lineNoParsed) ? lineNoParsed : NaN;
      const recvRaw = parseInternationalNumber((cells[idx("received_qty")] ?? "").trim()) ?? NaN;
      if (!shipmentNo) errors.push({ row, field: "shipment_no", shipment_no: "", po_number: poNumber, message: "shipment_no is required" });
      if (!poNumber) errors.push({ row, field: "po_number", shipment_no: shipmentNo, po_number: "", message: "po_number is required" });
      if (!Number.isInteger(lineNoRaw) || lineNoRaw < 1) {
        errors.push({ row, field: "line_number", shipment_no: shipmentNo, po_number: poNumber, message: "line_number must be an integer >= 1" });
      }
      if (!Number.isFinite(recvRaw) || recvRaw < 0) {
        errors.push({ row, field: "received_qty", shipment_no: shipmentNo, po_number: poNumber, message: "received_qty must be a non-negative number" });
      }
      const crText = (cells[idx("currency_rate")] ?? "").trim();
      const currencyRate = crText ? parseInternationalNumber(crText) : undefined;
      if (crText && (currencyRate == null || currencyRate <= 0)) {
        errors.push({ row, field: "currency_rate", shipment_no: shipmentNo, po_number: poNumber, message: "currency_rate must be a positive number" });
      }
      if (!shipmentNo || !poNumber || !Number.isInteger(lineNoRaw) || lineNoRaw < 1 || !Number.isFinite(recvRaw) || recvRaw < 0) continue;

      let rowFieldErrors = false;
      const optDate = (key: (typeof SHIPMENT_COMBINED_CSV_HEADERS)[number], fieldLabel: string): string | undefined => {
        const v = (cells[idx(key)] ?? "").trim();
        if (!v) return undefined;
        if (!isValidDateString(v)) {
          errors.push({ row, field: key, shipment_no: shipmentNo, po_number: poNumber, message: `${fieldLabel} must be a valid date` });
          rowFieldErrors = true;
          return undefined;
        }
        return normalizeCsvDateToApi(v);
      };
      const optNonNeg = (key: (typeof SHIPMENT_COMBINED_CSV_HEADERS)[number], label: string): number | undefined => {
        const t = (cells[idx(key)] ?? "").trim();
        if (!t) return undefined;
        const n = parseInternationalNumber(t);
        if (n == null || n < 0) {
          errors.push({ row, field: key, shipment_no: shipmentNo, po_number: poNumber, message: `${label} must be a non-negative number` });
          rowFieldErrors = true;
          return undefined;
        }
        return n;
      };

      const etd = optDate("etd", "etd");
      const eta = optDate("eta", "eta");
      if (etd && eta) {
        const etdY = etd.slice(0, 10);
        const etaY = eta.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(etdY) && /^\d{4}-\d{2}-\d{2}$/.test(etaY) && etaY <= etdY) {
          errors.push({
            row,
            field: "eta",
            shipment_no: shipmentNo,
            po_number: poNumber,
            message: "eta must be after etd",
          });
          rowFieldErrors = true;
        }
      }
      const atd = optDate("atd", "atd");
      const ata = optDate("ata", "ata");
      const nopen_date = optDate("nopen_date", "nopen_date");
      const delivered_at = optDate("delivered_at", "delivered_at");

      const bmText = (cells[idx("bm_percentage")] ?? "").trim();
      let bm_percentage: number | undefined;
      if (bmText) {
        const n = parseInternationalNumber(bmText);
        if (n == null || n < 0 || n > 100) {
          errors.push({ row, field: "bm_percentage", shipment_no: shipmentNo, po_number: poNumber, message: "bm_percentage must be between 0 and 100" });
          rowFieldErrors = true;
        } else bm_percentage = n;
      }

      const pct0to100 = (headerKey: "ppn_percentage" | "pph_percentage", fieldLabel: string): number | undefined => {
        const t = (cells[idx(headerKey)] ?? "").trim();
        if (!t) return undefined;
        const n = parseInternationalNumber(t);
        if (n == null || n < 0 || n > 100) {
          errors.push({
            row,
            field: headerKey,
            shipment_no: shipmentNo,
            po_number: poNumber,
            message: `${fieldLabel} must be between 0 and 100`,
          });
          rowFieldErrors = true;
          return undefined;
        }
        return n;
      };
      const ppn_percentage = pct0to100("ppn_percentage", "ppn_percentage");
      const pph_percentage = pct0to100("pph_percentage", "pph_percentage");

      const cbm = optNonNeg("cbm", "cbm");
      const incoterm_amount = optNonNeg("incoterm_amount", "incoterm_amount (Service & Charge)");
      const net_weight_mt = optNonNeg("net_weight_mt", "net_weight_mt");
      const gross_weight_mt = optNonNeg("gross_weight_mt", "gross_weight_mt");

      const remarksBase = (cells[idx("remarks")] ?? "").trim() || undefined;
      const totalPoRaw = cells[idx("total_po_amount")] ?? "";
      const remarks = buildRemarksWithTotalPo(remarksBase, totalPoRaw);

      const dto: UpdateShipmentDto = {
        vendor_name: (cells[idx("vendor_name")] ?? "").trim() || undefined,
        forwarder_name: (cells[idx("forwarder_name")] ?? "").trim() || undefined,
        incoterm: (cells[idx("incoterm")] ?? "").trim() || undefined,
        shipment_method: (cells[idx("shipment_method")] ?? "").trim() || undefined,
        origin_port_name: (cells[idx("origin_port_name")] ?? "").trim() || undefined,
        origin_port_country: (cells[idx("origin_port_country")] ?? "").trim() || undefined,
        destination_port_name: (cells[idx("destination_port_name")] ?? "").trim() || undefined,
        destination_port_country: (cells[idx("destination_port_country")] ?? "").trim() || undefined,
        etd,
        eta,
        atd,
        ata,
        product_classification: (cells[idx("product_classification")] ?? "").trim() || undefined,
        pib_type: (cells[idx("pib_type")] ?? "").trim() || undefined,
        no_request_pib: (cells[idx("no_request_pib")] ?? "").trim() || undefined,
        nopen: (cells[idx("nopen")] ?? "").trim() || undefined,
        nopen_date,
        bl_awb: (cells[idx("bl_awb")] ?? "").trim() || undefined,
        insurance_no: (cells[idx("insurance_no")] ?? "").trim() || undefined,
        coo: (cells[idx("coo")] ?? "").trim() || undefined,
        cbm,
        incoterm_amount,
        net_weight_mt,
        gross_weight_mt,
        bm_percentage,
        ppn_percentage,
        pph_percentage,
        closed_at: delivered_at,
        remarks,
      };
      if (rowFieldErrors) continue;
      const arr = byShipment.get(shipmentNo) ?? [];
      arr.push({
        row,
        shipment_no: shipmentNo,
        po_number: poNumber,
        line_number: lineNoRaw,
        received_qty: recvRaw,
        invoice_no: (cells[idx("invoice_no")] ?? "").trim() || undefined,
        currency_rate: currencyRate,
        currency: (cells[idx("currency")] ?? "").trim() || undefined,
        pt: (cells[idx("pt")] ?? "").trim() || undefined,
        plant: (cells[idx("plant")] ?? "").trim() || undefined,
        shipment_fields: dto,
      });
      byShipment.set(shipmentNo, arr);
    }

    let importedShipments = 0;
    let importedRows = 0;
    for (const [shipmentNo, rows] of byShipment) {
      const first = rows[0]!;
      const inconsistent = rows.some((r) => JSON.stringify(r.shipment_fields) !== JSON.stringify(first.shipment_fields));
      if (inconsistent) {
        for (const r of rows) {
          errors.push({
            row: r.row,
            field: "shipment_group",
            shipment_no: r.shipment_no,
            po_number: r.po_number,
            message: "Rows with the same shipment_no must share identical shipment fields",
          });
        }
        continue;
      }

      let shipmentId: string;
      const existing = await this.repo.findByShipmentNo(shipmentNo);
      if (existing) {
        shipmentId = existing.id;
        await this.update(existing.id, first.shipment_fields);
      } else {
        const created = await this.repo.create(combinedRowToCreateDto(first.shipment_fields), shipmentNo);
        shipmentId = created.id;
        await this.statusHistoryRepo.create({
          shipmentId,
          previousStatus: null,
          newStatus: "INITIATE_SHIPPING_DOCUMENT",
          remarks: null,
          changedBy: "CSV import",
        });
        await this.update(shipmentId, first.shipment_fields);
      }

      const byIntake = new Map<string, Array<{ row: number; po_number: string; item_id: string; received_qty: number; invoice_no?: string; currency_rate?: number }>>();
      let hasGroupError = false;
      for (const r of rows) {
        const intakeId = await poIntakeRepo.findIdByPoNumberTrimmed(r.po_number);
        if (!intakeId) {
          errors.push({ row: r.row, field: "po_number", shipment_no: r.shipment_no, po_number: r.po_number, message: "PO not found in system" });
          hasGroupError = true;
          continue;
        }
        const intake = await poIntakeRepo.findById(intakeId);
        if (!intake) {
          errors.push({ row: r.row, field: "po_number", shipment_no: r.shipment_no, po_number: r.po_number, message: "PO not found in system" });
          hasGroupError = true;
          continue;
        }
        if (r.currency && normalizeGroupField(r.currency) !== normalizeGroupField(intake.currency)) {
          errors.push({
            row: r.row,
            field: "currency",
            shipment_no: r.shipment_no,
            po_number: r.po_number,
            message: `currency must match PO in system (${intake.currency ?? "—"})`,
          });
          hasGroupError = true;
          continue;
        }
        if (r.pt && normalizeGroupField(r.pt) !== normalizeGroupField(intake.pt)) {
          errors.push({
            row: r.row,
            field: "pt",
            shipment_no: r.shipment_no,
            po_number: r.po_number,
            message: `pt must match PO in system (${intake.pt ?? "—"})`,
          });
          hasGroupError = true;
          continue;
        }
        if (r.plant && normalizeGroupField(r.plant) !== normalizeGroupField(intake.plant)) {
          errors.push({
            row: r.row,
            field: "plant",
            shipment_no: r.shipment_no,
            po_number: r.po_number,
            message: `plant must match PO in system (${intake.plant ?? "—"})`,
          });
          hasGroupError = true;
          continue;
        }
        const poItems = await poIntakeRepo.findItemsByIntakeId(intakeId);
        const item = poItems.find((x) => x.line_number === r.line_number);
        if (!item) {
          errors.push({
            row: r.row,
            field: "line_number",
            shipment_no: r.shipment_no,
            po_number: r.po_number,
            message: `PO line ${r.line_number} not found`,
          });
          hasGroupError = true;
          continue;
        }
        const a = byIntake.get(intakeId) ?? [];
        a.push({ row: r.row, po_number: r.po_number, item_id: item.id, received_qty: r.received_qty, invoice_no: r.invoice_no, currency_rate: r.currency_rate });
        byIntake.set(intakeId, a);
      }
      if (hasGroupError) continue;

      try {
        for (const [intakeId, list] of byIntake) {
          const isCoupled = await this.mappingRepo.isCoupled(shipmentId, intakeId);
          if (!isCoupled) {
            await this.couplePo(shipmentId, [intakeId], "CSV Import");
          }
          const firstMap = list[0]!;
          if (firstMap.invoice_no !== undefined || firstMap.currency_rate !== undefined) {
            await this.updatePoMapping(shipmentId, intakeId, {
              invoice_no: firstMap.invoice_no ?? null,
              currency_rate: firstMap.currency_rate ?? null,
            });
          }
          await this.updatePoLines(
            shipmentId,
            intakeId,
            list.map((x) => ({ item_id: x.item_id, received_qty: x.received_qty }))
          );
        }
        importedShipments += 1;
        importedRows += rows.length;
      } catch (e) {
        const message = e instanceof AppError ? e.message : "Failed to import shipment group";
        for (const r of rows) {
          errors.push({ row: r.row, field: "shipment_group", shipment_no: r.shipment_no, po_number: r.po_number, message });
        }
      }
    }

    const totalBodyRows = lines.length - 1 - skippedEmptyBodyRows;
    return {
      total_rows: totalBodyRows,
      imported_shipments: importedShipments,
      imported_rows: importedRows,
      failed_rows: totalBodyRows - importedRows,
      errors: errors.sort((a, b) => a.row - b.row),
    };
  }

  async list(query: ListShipmentsQuery): Promise<{ items: ShipmentListItem[]; total: number }> {
    const { rows, total } = await this.repo.findAll(query);
    const ids = rows.map((r) => r.id);
    const byShipment = await this.mappingRepo.findActiveLinkedPosWithItemsByShipmentIds(ids);
    const items = rows.map((row) => toListItem(row, byShipment.get(row.id) ?? []));
    return { items, total };
  }

  async listFilterOptions(): Promise<ShipmentListFilterOptions> {
    return this.repo.listDistinctFilterOptions();
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

    const effectiveEtd =
      dto.etd !== undefined
        ? dto.etd.trim()
          ? shipmentDateToYmd(dto.etd)
          : null
        : shipmentDateToYmd(existing.etd);
    const effectiveEta =
      dto.eta !== undefined
        ? dto.eta.trim()
          ? shipmentDateToYmd(dto.eta)
          : null
        : shipmentDateToYmd(existing.eta);
    if (effectiveEtd && effectiveEta && effectiveEta <= effectiveEtd) {
      throw new AppError("ETA must be after ETD", 400, [
        { field: "eta", message: "ETA must be a date after ETD" },
      ]);
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
    const intake = await poIntakeRepo.findById(intakeId);
    if (!intake) throw new AppError("PO intake not found", 404);

    if (data.currency_rate !== undefined) {
      const cur = String(intake.currency ?? "")
        .trim()
        .toUpperCase();
      const isIdr = cur === "IDR";
      const enforceRate = isAtOrPastCustomsClearance(shipment.current_status);
      if (isIdr) {
        if (data.currency_rate != null && data.currency_rate !== 0) {
          throw new AppError("Currency rate must be empty or zero for IDR PO lines.", 400);
        }
        data = { ...data, currency_rate: null };
      } else if (enforceRate) {
        const r = data.currency_rate;
        if (r == null || !Number.isFinite(Number(r)) || Number(r) <= 0) {
          throw new AppError(
            "Currency rate is required and must be greater than 0 for non-IDR currency at this shipment status.",
            400
          );
        }
      }
    }

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
    const itemDescriptionById = new Map(
      poItems.map((i) => [i.id, (i.item_description ?? "").trim() || null] as const)
    );
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
      lines.map(({ item_id, received_qty }) => ({
        item_id,
        received_qty,
        item_description: itemDescriptionById.get(item_id) ?? null,
      }))
    );
    for (const line of lines) {
      await poIntakeRepo.recomputeTotalAmountItemByLine(intakeId, line.item_id);
    }
    await syncPoIntakeStatus(intakeId);
    return this.getById(shipmentId);
  }
}

