/**
 * Required fields per shipment status for status-update UX.
 * When moving to a status (or skipping ahead), all required fields for that status
 * and any intermediate statuses must be filled.
 *
 * Document checks (uploaded files on the shipment) use the same transition path;
 * optional documents are listed in STATUS_REQUIRED_DOCS but do not block updates.
 *
 * Incoterm-based rules:
 * - EXW / FCA / FOB: Buyer arranges transport → BIDDING_TRANSPORTER exists.
 * - CFR / CIF / CPT / CIP / DAP / DPU / DDP: Other party arranges transport → BIDDING_TRANSPORTER is skipped.
 */

import type { ShipmentDocumentListItem } from "@/types/shipments";

export const SHIPMENT_STATUS_ORDER = [
  "INITIATE_SHIPPING_DOCUMENT",
  "BIDDING_TRANSPORTER",
  "TRANSPORT_CONFIRMED",
  "READY_PICKUP",
  "PICKED_UP",
  "ON_SHIPMENT",
  "CUSTOMS_CLEARANCE",
  "DELIVERED",
] as const;

/** Incoterms where buyer arranges transport: Bidding Transporter step exists and is validated */
export const INCOTERMS_WITH_BIDDING_TRANSPORTER = ["EXW", "FCA", "FOB"] as const;

/** Incoterms where other party arranges transport: Bidding Transporter skipped */
export const INCOTERMS_WITHOUT_BIDDING_TRANSPORTER = ["CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"] as const;

function normalizeIncoterm(incoterm: string | null | undefined): string {
  return (incoterm ?? "").trim().toUpperCase();
}

function hasBiddingTransporterStep(incoterm: string | null | undefined): boolean {
  const n = normalizeIncoterm(incoterm);
  return INCOTERMS_WITH_BIDDING_TRANSPORTER.includes(n as (typeof INCOTERMS_WITH_BIDDING_TRANSPORTER)[number]);
}

/**
 * Returns the list of statuses that apply for this shipment based on incoterm.
 * When incoterm is CFR/CIF/CPT/CIP/DAP/DPU/DDP, BIDDING_TRANSPORTER is excluded.
 */
export function getApplicableStatuses(incoterm: string | null | undefined): readonly string[] {
  if (hasBiddingTransporterStep(incoterm)) return SHIPMENT_STATUS_ORDER;
  return SHIPMENT_STATUS_ORDER.filter((s) => s !== "BIDDING_TRANSPORTER");
}

/** Human-readable field labels for missing-field messages */
export const STATUS_FIELD_LABELS: Record<string, string> = {
  ship_by: "Ship by",
  pib_type: "PIB type",
  no_request_pib: "PIB Doc No",
  nopen: "Nopen",
  nopen_date: "Nopen Date",
  coo: "COO (Certificate of Origin)",
  origin_port_name: "Origin port name",
  origin_port_country: "Origin port country",
  etd: "ETD (Est. time departure)",
  eta: "ETA (Est. time arrival)",
  forwarder_name: "Forwarder name",
  shipment_method: "Ship via (Air / Sea)",
  destination_port_name: "Destination port name",
  destination_port_country: "Destination port country",
  atd: "ATD (actual departure)",
  ata: "ATA (actual arrival)",
  depo: "Depo",
  depo_location: "Depo location",
  bl_awb: "BL/AWB",
  has_linked_po: "At least one PO in the group",
  has_bidding_participant: "At least one Forwarder Bidding participant",
  has_received_this_shipment: "Delivered Qty on group PO lines",
  has_currency_rate: "Currency rate on group PO",
  bm_percentage: "BM rate (%)",
  closed_at: "Delivered at",
  incoterm_amount: "Service & charge (incoterm amount)",
  product_classification: "Product classification type",
  surveyor: "Surveyor",
};

/** Synthetic keys returned with field keys from getMissingRequiredDocuments (scroll + labels). */
export const STATUS_DOC_REQUIREMENT_LABELS: Record<string, string> = {
  "doc:po": "PO (one upload per group PO — Documents)",
  "doc:commercial_invoice": "Commercial Invoice (Documents)",
  "doc:packing_list": "Packing List (Documents)",
  "doc:bl": "Bill of Lading (Documents)",
  "doc:pib_bc": "PIB / BC (Documents)",
  "doc:sppb": "SPPB (Documents)",
  "doc:vo": "VO (Documents — required at Ready Pickup when Surveyor is Yes)",
};

/**
 * Required / optional documents per status for the status-update hint text.
 * Optional items are not enforced by getMissingRequiredDocuments.
 */
export const STATUS_REQUIRED_DOCS: Record<string, string[]> = {
  INITIATE_SHIPPING_DOCUMENT: ["PO", "Commercial Invoice", "Packing List"],
  BIDDING_TRANSPORTER: ["Quotation from each forwarder (optional)"],
  TRANSPORT_CONFIRMED: [],
  READY_PICKUP: ["VO (required when Surveyor is Yes)"],
  PICKED_UP: ["Bill of Lading", "Laporan Surveyor (optional)"],
  ON_SHIPMENT: ["COO (optional)", "Insurance (optional)"],
  CUSTOMS_CLEARANCE: ["PIB / BC", "SPPB", "SPPBMCP (optional)"],
  DELIVERED: [],
};

export interface StatusRequirement {
  status: string;
  requiredFields: string[];
  requiredDocs: string[];
}

const STATUS_REQUIREMENTS: Record<string, StatusRequirement> = {
  INITIATE_SHIPPING_DOCUMENT: {
    status: "INITIATE_SHIPPING_DOCUMENT",
    requiredFields: [
      "ship_by",
      "pib_type",
      "origin_port_name",
      "origin_port_country",
      "etd",
      "eta",
      "product_classification",
      "depo",
      "surveyor",
    ],
    requiredDocs: STATUS_REQUIRED_DOCS.INITIATE_SHIPPING_DOCUMENT,
  },
  BIDDING_TRANSPORTER: {
    status: "BIDDING_TRANSPORTER",
    /** Work happens here (add forwarder bids); validation is enforced when leaving to Transport Confirmed. */
    requiredFields: ["has_bidding_participant", "incoterm_amount"],
    requiredDocs: STATUS_REQUIRED_DOCS.BIDDING_TRANSPORTER,
  },
  TRANSPORT_CONFIRMED: {
    status: "TRANSPORT_CONFIRMED",
    requiredFields: ["shipment_method", "incoterm_amount", "destination_port_name", "destination_port_country"],
    requiredDocs: [],
  },
  READY_PICKUP: {
    status: "READY_PICKUP",
    requiredFields: ["bl_awb"],
    requiredDocs: STATUS_REQUIRED_DOCS.READY_PICKUP,
  },
  PICKED_UP: {
    status: "PICKED_UP",
    requiredFields: ["atd", "has_linked_po", "has_received_this_shipment"],
    requiredDocs: STATUS_REQUIRED_DOCS.PICKED_UP,
  },
  ON_SHIPMENT: {
    status: "ON_SHIPMENT",
    requiredFields: ["no_request_pib", "nopen", "nopen_date"],
    requiredDocs: STATUS_REQUIRED_DOCS.ON_SHIPMENT,
  },
  CUSTOMS_CLEARANCE: {
    status: "CUSTOMS_CLEARANCE",
    requiredFields: ["ata", "has_currency_rate", "bm_percentage"],
    requiredDocs: STATUS_REQUIRED_DOCS.CUSTOMS_CLEARANCE,
  },
  DELIVERED: {
    status: "DELIVERED",
    requiredFields: ["closed_at"],
    requiredDocs: [],
  },
};

function statusIndex(status: string): number {
  const i = SHIPMENT_STATUS_ORDER.indexOf(status as (typeof SHIPMENT_STATUS_ORDER)[number]);
  return i === -1 ? -1 : i;
}

function statusIndexInList(status: string, list: readonly string[]): number {
  const i = list.indexOf(status);
  return i === -1 ? -1 : i;
}

/**
 * Returns statuses that must have their requirements satisfied when moving from
 * currentStatus to targetStatus (includes target, and any skipped intermediate).
 * When incoterm is CFR/CIF/CPT/CIP/DAP/DPU/DDP, BIDDING_TRANSPORTER is excluded from the path.
 */
export function getStatusesRequiredForTransition(
  currentStatus: string,
  targetStatus: string,
  incoterm?: string | null
): string[] {
  const applicable = getApplicableStatuses(incoterm);
  const current = statusIndexInList(currentStatus, applicable);
  const target = statusIndexInList(targetStatus, applicable);
  if (current === -1 || target === -1 || target <= current) return [];
  const out: string[] = [];
  for (let i = current + 1; i <= target; i++) {
    out.push(applicable[i]);
  }
  return out;
}

/**
 * Returns all required field keys for moving from currentStatus to targetStatus
 * (union of required fields for every applicable status up to the target).
 */
export function getRequiredFieldsForTransition(
  currentStatus: string,
  targetStatus: string,
  incoterm?: string | null
): string[] {
  const applicable = getApplicableStatuses(incoterm);
  const current = statusIndexInList(currentStatus, applicable);
  const target = statusIndexInList(targetStatus, applicable);
  if (current === -1 || target === -1 || target <= current) return [];
  // Re-validate all status requirements up to target on every forward transition.
  const statuses = applicable.slice(0, target + 1);
  const set = new Set<string>();

  const biddingStepApplies = hasBiddingTransporterStep(incoterm);
  for (const s of statuses) {
    const req = STATUS_REQUIREMENTS[s];
    if (req) {
      for (const f of req.requiredFields) {
        if (f === "has_bidding_participant" && !biddingStepApplies) continue;
        set.add(f);
      }
    }
  }
  return Array.from(set);
}

/**
 * Check which required fields are missing on the shipment detail for the given transition.
 * Uses detail.incoterm to apply incoterm-based rules (Bidding Transporter skip).
 */
export function getMissingRequiredFields(
  currentStatus: string,
  targetStatus: string,
  detail: {
    incoterm?: string | null;
    ship_by?: string | null;
    pib_type?: string | null;
    no_request_pib?: string | null;
    nopen?: string | null;
    nopen_date?: string | null;
    coo?: string | null;
    origin_port_name?: string | null;
    origin_port_country?: string | null;
    etd?: string | null;
    eta?: string | null;
    forwarder_name?: string | null;
    shipment_method?: string | null;
    destination_port_name?: string | null;
    destination_port_country?: string | null;
    surveyor?: string | null;
    bl_awb?: string | null;
    atd?: string | null;
    ata?: string | null;
    depo?: boolean | null;
    bm_percentage?: number | null;
    product_classification?: string | null;
    closed_at?: string | null;
    bids?: unknown[];
    linked_pos?: unknown[];
  }
): string[] {
  const required = getRequiredFieldsForTransition(currentStatus, targetStatus, detail.incoterm);
  const missing: string[] = [];
  for (const key of required) {
    if (key === "has_linked_po") {
      const count = detail.linked_pos?.length ?? 0;
      if (count < 1) missing.push(key);
      continue;
    }
    if (key === "has_bidding_participant") {
      const bidCount = detail.bids?.length ?? 0;
      if (bidCount < 1) missing.push(key);
      continue;
    }
    if (key === "has_received_this_shipment") {
      const linked = Array.isArray(detail.linked_pos) ? detail.linked_pos : [];
      const hasReceived = linked.some((po) => {
        if (!po || typeof po !== "object") return false;
        const lines = (po as { line_received?: unknown[] }).line_received;
        if (!Array.isArray(lines)) return false;
        return lines.some((line) => {
          if (!line || typeof line !== "object") return false;
          const qty = Number((line as { received_qty?: unknown }).received_qty);
          return Number.isFinite(qty) && qty > 0;
        });
      });
      if (!hasReceived) missing.push(key);
      continue;
    }
    if (key === "has_currency_rate") {
      const linked = Array.isArray(detail.linked_pos) ? detail.linked_pos : [];
      const hasLinked = linked.length > 0;
      const allIdr =
        hasLinked &&
        linked.every((po) => {
          if (!po || typeof po !== "object") return false;
          const c = String((po as { currency?: unknown }).currency ?? "")
            .trim()
            .toUpperCase();
          return c === "IDR";
        });
      if (allIdr) {
        continue;
      }
      const allHaveRate =
        hasLinked &&
        linked.every((po) => {
          if (!po || typeof po !== "object") return false;
          const raw = (po as { currency_rate?: unknown }).currency_rate;
          const n = Number(raw);
          return Number.isFinite(n) && n > 0;
        });
      if (!allHaveRate) missing.push(key);
      continue;
    }
    const value = (detail as Record<string, unknown>)[key];
    if (value == null || (typeof value === "string" && value.trim() === "")) {
      missing.push(key);
    }
  }
  return missing;
}

function hasShipmentLevelCommercialInvoice(docs: ShipmentDocumentListItem[]): boolean {
  return docs.some(
    (d) =>
      d.document_type === "INVOICE" &&
      d.intake_id == null &&
      (d.status == null || d.status === "DRAFT" || d.status === "FINAL")
  );
}

function hasPackingListDoc(docs: ShipmentDocumentListItem[]): boolean {
  return docs.some((d) => d.document_type === "PACKING_LIST");
}

function hasBlDoc(docs: ShipmentDocumentListItem[]): boolean {
  return docs.some((d) => d.document_type === "BL");
}

function hasPibBcDoc(docs: ShipmentDocumentListItem[]): boolean {
  return docs.some((d) => d.document_type === "PIB_BC");
}

function hasSppbDoc(docs: ShipmentDocumentListItem[]): boolean {
  return docs.some((d) => d.document_type === "SPPB");
}

function hasVoDoc(docs: ShipmentDocumentListItem[]): boolean {
  return docs.some((d) => d.document_type === "VO");
}

function isSurveyorYes(surveyor: string | null | undefined): boolean {
  return (surveyor ?? "").trim() === "Yes";
}

function linkedPosMissingPoDoc(
  docs: ShipmentDocumentListItem[],
  linkedPos: { intake_id: string }[]
): boolean {
  return linkedPos.some(
    (po) => !docs.some((d) => d.document_type === "PO" && d.intake_id === po.intake_id)
  );
}

export type ShipmentDocumentValidationContext = {
  documents: ShipmentDocumentListItem[];
  linked_pos: { intake_id: string }[];
  /** Used for VO requirement at Ready Pickup when Surveyor is Yes. */
  surveyor: string | null;
};

/**
 * Document uploads required for the transition (same path as fields).
 * Returns synthetic keys `doc:*` merged with field keys in the UI; optional docs never appear here.
 */
export function getMissingRequiredDocuments(
  currentStatus: string,
  targetStatus: string,
  incoterm: string | null | undefined,
  ctx: ShipmentDocumentValidationContext
): string[] {
  const statuses = getStatusesRequiredForTransition(currentStatus, targetStatus, incoterm);
  const missing = new Set<string>();
  const docs = ctx.documents ?? [];
  const linked = ctx.linked_pos ?? [];

  const leavingInitiate = currentStatus === "INITIATE_SHIPPING_DOCUMENT" && statuses.length > 0;
  if (leavingInitiate) {
    if (linked.length > 0 && linkedPosMissingPoDoc(docs, linked)) {
      missing.add("doc:po");
    }
    if (!hasShipmentLevelCommercialInvoice(docs)) {
      missing.add("doc:commercial_invoice");
    }
    if (!hasPackingListDoc(docs)) {
      missing.add("doc:packing_list");
    }
  }

  for (const s of statuses) {
    if (s === "READY_PICKUP" && isSurveyorYes(ctx.surveyor)) {
      if (!hasVoDoc(docs)) missing.add("doc:vo");
    }
    if (s === "PICKED_UP") {
      if (!hasBlDoc(docs)) missing.add("doc:bl");
    }
    if (s === "CUSTOMS_CLEARANCE") {
      if (!hasPibBcDoc(docs)) missing.add("doc:pib_bc");
      if (!hasSppbDoc(docs)) missing.add("doc:sppb");
    }
  }

  return Array.from(missing);
}

export function getRequiredDocsForStatus(status: string): string[] {
  return STATUS_REQUIRED_DOCS[status] ?? [];
}

/**
 * Returns required documents for the transition. Uses incoterm so path excludes BIDDING_TRANSPORTER when applicable.
 */
export function getRequiredDocsForTransition(
  currentStatus: string,
  targetStatus: string,
  incoterm?: string | null
): string[] {
  const statuses = getStatusesRequiredForTransition(currentStatus, targetStatus, incoterm);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of statuses) {
    for (const doc of getRequiredDocsForStatus(s)) {
      if (!seen.has(doc)) {
        seen.add(doc);
        out.push(doc);
      }
    }
  }
  return out;
}

export function getFieldLabel(fieldKey: string): string {
  if (fieldKey.startsWith("doc:")) {
    return STATUS_DOC_REQUIREMENT_LABELS[fieldKey] ?? fieldKey;
  }
  return STATUS_FIELD_LABELS[fieldKey] ?? fieldKey;
}
