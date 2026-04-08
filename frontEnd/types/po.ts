/**
 * PO (imported PO intake) API types — align with backend GET /po, GET /po/:id.
 * Final data: Plant, PO Number, Supplier name, Items (Qty, Unit, Value), Incoterms.
 */

export interface PoListItem {
  id: string;
  external_id: string;
  po_number: string;
  plant: string | null;
  pt: string | null;
  supplier_name: string;
  delivery_location: string | null;
  incoterm_location: string | null;
  kawasan_berikat: string | null;
  currency: string | null;
  intake_status: string;
  taken_by_user_id: string | null;
  taken_by_name: string | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListPoQuery {
  page?: number;
  limit?: number;
  search?: string;
  intake_status?: string;
  po_number?: string;
}

export interface ListPoMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PoItemSummary {
  id: string;
  line_number: number;
  item_description: string | null;
  qty: number | null;
  unit: string | null;
  value: number | null;
  kurs: number | null;
  net_weight_mt: number | null;
  gross_weight_mt: number | null;
  received_qty: number | null;
  remaining_qty: number | null;
  over_received_pct: number | null;
}

export interface PoLinkedShipmentLineReceived {
  item_id: string;
  line_number: number;
  item_description: string | null;
  received_qty: number;
}

export interface PoLinkedShipment {
  shipment_id: string;
  shipment_number: string;
  current_status: string;
  incoterm?: string | null;
  coupled_at: string;
  coupled_by: string;
  atd: string | null;
  ata: string | null;
  delivered_at: string | null;
  lines_received: PoLinkedShipmentLineReceived[];
}

export interface PoDetail {
  id: string;
  external_id: string;
  po_number: string;
  plant: string | null;
  pt: string | null;
  supplier_name: string;
  delivery_location: string | null;
  incoterm_location: string | null;
  kawasan_berikat: string | null;
  currency: string | null;
  intake_status: string;
  taken_by_user_id: string | null;
  taken_by_name: string | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string;
  items: PoItemSummary[];
  linked_shipments: PoLinkedShipment[];
  /** Total delivered qty exceeds total PO qty (shown with Fulfilled). */
  overshipped?: boolean;
}

/** Payload for temporary "Create test PO" (POST /po/test-create). Matches backend CreatePoIntakeDto. 1 PO = multiple items, 1 incoterm. */
export interface CreateTestPoItem {
  item_description?: string;
  qty?: number;
  unit?: string;
  value?: number;
  kurs?: number;
  net_weight_mt?: number;
  gross_weight_mt?: number;
}

export interface CreateTestPoPayload {
  external_id: string;
  po_number: string;
  plant?: string;
  pt?: string;
  supplier_name: string;
  delivery_location?: string;
  incoterm_location?: string;
  kawasan_berikat?: string;
  /** Currency for this PO (e.g. USD, IDR). Shown in form; may be used for items. */
  currency?: string;
  items?: CreateTestPoItem[];
}

/** PATCH /po/:id — matches backend UpdatePoIntakeDto. */
export interface UpdatePoItemPayload {
  id?: string;
  line_number?: number;
  item_description: string;
  qty: number;
  unit: string;
  value: number;
}

export interface UpdatePoPayload {
  po_number: string;
  plant?: string;
  pt?: string;
  supplier_name: string;
  delivery_location?: string;
  incoterm_location?: string;
  kawasan_berikat?: string;
  currency?: string;
  items: UpdatePoItemPayload[];
}

export interface PoImportCsvErrorRow {
  row: number;
  field: string;
  po_number: string;
  message: string;
}

export interface PoImportCsvResult {
  total_rows: number;
  imported_pos: number;
  imported_rows: number;
  failed_rows: number;
  errors: PoImportCsvErrorRow[];
}

export interface PoImportHistoryItem {
  id: string;
  file_name: string | null;
  uploaded_by: string;
  total_rows: number;
  imported_pos: number;
  imported_rows: number;
  failed_rows: number;
  status: string;
  created_at: string;
  finished_at: string | null;
}

/** GET /po/:id/activity-log — aligned with shipment activity log shape. */
export interface PoIntakeActivityItem {
  id: string;
  type: "po_created" | "po_claimed" | "couple_shipment" | "decouple_shipment" | "po_updated";
  title: string;
  detail: string | null;
  field_changes?: Array<{
    field: string;
    label: string;
    before: string | null;
    after: string | null;
  }>;
  actor: string;
  occurred_at: string;
}
