/**
 * PO intake DTOs. Intake from SaaS; duplicate prevention; status and assignment.
 */

export const INTAKE_STATUSES = [
  "NEW_PO_DETECTED",
  "NOTIFIED",
  "TAKEN_BY_EXIM",
  "GROUPED_TO_SHIPMENT",
] as const;

export type IntakeStatus = (typeof INTAKE_STATUSES)[number];

export interface PoIntakeItemDto {
  item_description?: string;
  qty?: number;
  unit?: string;
  value?: number;
  kurs?: number;
}

/** Create intake (ingestion or test-create). Matches SaaS payload. Rule: 1 PO = multiple items, 1 incoterm. */
export interface CreatePoIntakeDto {
  external_id: string;
  po_number: string;
  plant?: string;
  supplier_name: string;
  delivery_location?: string;
  incoterm_location?: string;
  kawasan_berikat?: string;
  items?: PoIntakeItemDto[];
}

/** List query. */
export interface ListPoIntakeQuery {
  page?: number;
  limit?: number;
  search?: string;
  intake_status?: string;
  po_number?: string;
}

export interface PoIntakeRow {
  id: string;
  external_id: string;
  po_number: string;
  plant: string | null;
  supplier_name: string;
  delivery_location: string | null;
  incoterm_location: string | null;
  kawasan_berikat: string | null;
  intake_status: string;
  taken_by_user_id: string | null;
  taken_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PoIntakeItemRow {
  id: string;
  intake_id: string;
  line_number: number;
  item_description: string | null;
  qty: number | null;
  unit: string | null;
  value: number | null;
  kurs: number | null;
  created_at: Date;
}

export interface PoIntakeListItem {
  id: string;
  external_id: string;
  po_number: string;
  plant: string | null;
  supplier_name: string;
  delivery_location: string | null;
  incoterm_location: string | null;
  intake_status: string;
  taken_at: string | null;
  created_at: string;
}

export interface PoIntakeDetail {
  id: string;
  external_id: string;
  po_number: string;
  plant: string | null;
  supplier_name: string;
  delivery_location: string | null;
  incoterm_location: string | null;
  kawasan_berikat: string | null;
  intake_status: string;
  taken_by_user_id: string | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string;
  items: {
    id: string;
    line_number: number;
    item_description: string | null;
    qty: number | null;
    unit: string | null;
    value: number | null;
    kurs: number | null;
  }[];
}

export interface CreatePoIntakeResponse {
  id: string;
  external_id: string;
  po_number: string;
  intake_status: string;
  created_at: string;
}
