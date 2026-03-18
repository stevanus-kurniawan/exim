/**
 * Required fields per shipment status for status-update UX.
 * When moving to a status (or skipping ahead), all required fields for that status
 * and any intermediate statuses must be filled.
 *
 * Incoterm-based rules:
 * - EXW / FCA / FOB: Buyer arranges transport → BIDDING_TRANSPORTER exists and is validated.
 * - CFR / CIF / CPT / CIP / DAP / DPU / DDP: Other party arranges transport → BIDDING_TRANSPORTER
 *   is skipped; Service & charge (incoterm amount) is optional.
 */

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

/** Incoterms where other party arranges transport: Bidding Transporter skipped, incoterm amount optional */
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
  coo: "COO",
  origin_port_name: "Origin port name",
  origin_port_country: "Origin port country",
  etd: "ETD (Est. time departure)",
  eta: "ETA (Est. time arrival)",
  forwarder_name: "Forwarder name",
  shipment_method: "Ship via (Air / Sea)",
  destination_port_name: "Destination port name",
  destination_port_country: "Destination port country",
  bl_awb: "BL/AWB",
  has_linked_po: "At least one linked PO",
  incoterm_amount: "Service & charge (incoterm amount)",
};

/** Required documents per status (informational only; not enforced until document API exists) */
export const STATUS_REQUIRED_DOCS: Record<string, string[]> = {
  INITIATE_SHIPPING_DOCUMENT: ["Packing List (draft)", "Invoice"],
  BIDDING_TRANSPORTER: ["Quotation from each forwarder (optional)"],
  TRANSPORT_CONFIRMED: [],
  READY_PICKUP: ["Packing list (final version)"],
  PICKED_UP: ["B/L (draft)"],
  ON_SHIPMENT: ["B/L (final)", "Invoice", "PIB"],
  CUSTOMS_CLEARANCE: ["SPPB"],
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
    requiredFields: ["ship_by", "pib_type", "coo", "origin_port_name", "origin_port_country", "etd", "eta"],
    requiredDocs: STATUS_REQUIRED_DOCS.INITIATE_SHIPPING_DOCUMENT,
  },
  BIDDING_TRANSPORTER: {
    status: "BIDDING_TRANSPORTER",
    requiredFields: ["forwarder_name"],
    requiredDocs: STATUS_REQUIRED_DOCS.BIDDING_TRANSPORTER,
  },
  TRANSPORT_CONFIRMED: {
    status: "TRANSPORT_CONFIRMED",
    requiredFields: ["forwarder_name", "shipment_method", "destination_port_name", "destination_port_country"],
    requiredDocs: [],
  },
  READY_PICKUP: {
    status: "READY_PICKUP",
    requiredFields: [],
    requiredDocs: STATUS_REQUIRED_DOCS.READY_PICKUP,
  },
  PICKED_UP: {
    status: "PICKED_UP",
    requiredFields: ["etd", "has_linked_po"],
    requiredDocs: STATUS_REQUIRED_DOCS.PICKED_UP,
  },
  ON_SHIPMENT: {
    status: "ON_SHIPMENT",
    requiredFields: ["bl_awb"],
    requiredDocs: STATUS_REQUIRED_DOCS.ON_SHIPMENT,
  },
  CUSTOMS_CLEARANCE: {
    status: "CUSTOMS_CLEARANCE",
    requiredFields: ["eta"],
    requiredDocs: STATUS_REQUIRED_DOCS.CUSTOMS_CLEARANCE,
  },
  DELIVERED: {
    status: "DELIVERED",
    requiredFields: [],
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
 * (union of required fields for each status in the path).
 * When incoterm is CFR/CIF/CPT/CIP/DAP/DPU/DDP, incoterm_amount is not required (optional).
 */
export function getRequiredFieldsForTransition(
  currentStatus: string,
  targetStatus: string,
  incoterm?: string | null
): string[] {
  const statuses = getStatusesRequiredForTransition(currentStatus, targetStatus, incoterm);
  const set = new Set<string>();
  const incotermAmountOptional = !hasBiddingTransporterStep(incoterm);
  for (const s of statuses) {
    const req = STATUS_REQUIREMENTS[s];
    if (req) {
      for (const f of req.requiredFields) {
        if (f === "incoterm_amount" && incotermAmountOptional) continue;
        set.add(f);
      }
    }
  }
  return Array.from(set);
}

/**
 * Check which required fields are missing on the shipment detail for the given transition.
 * Uses detail.incoterm to apply incoterm-based rules (Bidding Transporter skip, incoterm amount optional).
 */
export function getMissingRequiredFields(
  currentStatus: string,
  targetStatus: string,
  detail: {
    incoterm?: string | null;
    ship_by?: string | null;
    pib_type?: string | null;
    coo?: string | null;
    origin_port_name?: string | null;
    origin_port_country?: string | null;
    etd?: string | null;
    eta?: string | null;
    forwarder_name?: string | null;
    shipment_method?: string | null;
    destination_port_name?: string | null;
    destination_port_country?: string | null;
    bl_awb?: string | null;
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
    const value = (detail as Record<string, unknown>)[key];
    if (value == null || (typeof value === "string" && value.trim() === "")) {
      missing.push(key);
    }
  }
  return missing;
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
  return STATUS_FIELD_LABELS[fieldKey] ?? fieldKey;
}
