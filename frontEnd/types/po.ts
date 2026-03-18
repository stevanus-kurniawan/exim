/**
 * PO (imported PO intake) API types — align with backend GET /po, GET /po/:id.
 * Final data: Plant, PO Number, Supplier name, Items (Qty, Unit, Value), Incoterms.
 */

export interface PoListItem {
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
  received_qty: number | null;
  remaining_qty: number | null;
  over_received_pct: number | null;
}

export interface PoLinkedShipment {
  shipment_id: string;
  shipment_number: string;
  current_status: string;
  coupled_at: string;
  coupled_by: string;
}

export interface PoDetail {
  id: string;
  external_id: string;
  po_number: string;
  plant: string | null;
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
}

/** Payload for temporary "Create test PO" (POST /po/test-create). Matches backend CreatePoIntakeDto. 1 PO = multiple items, 1 incoterm. */
export interface CreateTestPoItem {
  item_description?: string;
  qty?: number;
  unit?: string;
  value?: number;
  kurs?: number;
}

export interface CreateTestPoPayload {
  external_id: string;
  po_number: string;
  plant?: string;
  supplier_name: string;
  delivery_location?: string;
  incoterm_location?: string;
  kawasan_berikat?: string;
  /** Currency for this PO (e.g. USD, IDR). Shown in form; may be used for items. */
  currency?: string;
  items?: CreateTestPoItem[];
}
