/**
 * Shipments API types — align with backend GET /shipments, GET /shipments/:id.
 */

export interface LinkedPoLineReceived {
  item_id: string;
  received_qty: number;
}

/** PO line row in shipment list expand panel. */
export interface ShipmentListPoLineItem {
  item_description: string | null;
  /** Quantity on the PO line. */
  qty_po: number | string | null;
  /** Quantity delivered on this shipment; null if not recorded. */
  delivery_qty: number | string | null;
  unit: string | null;
}

/** Linked PO with lines for shipment list. */
export interface ShipmentListLinkedPo {
  intake_id: string;
  po_number: string;
  pt: string | null;
  plant: string | null;
  taken_by_name: string | null;
  currency: string | null;
  intake_status: string | null;
  items: ShipmentListPoLineItem[];
}

export interface LinkedPoSummary {
  intake_id: string;
  po_number: string;
  /** Legal entity / PT code from PO header. */
  pt: string | null;
  plant: string | null;
  supplier_name: string;
  incoterm_location: string | null;
  currency: string | null;
  invoice_no: string | null;
  currency_rate: number | null;
  coupled_at: string;
  coupled_by: string;
  taken_by_name: string | null;
  line_received: LinkedPoLineReceived[];
}

export interface ShipmentListItem {
  id: string;
  shipment_number: string;
  supplier_name: string | null;
  vendor_name: string | null;
  incoterm: string | null;
  pib_type: string | null;
  shipment_method: string | null;
  product_classification: string | null;
  ship_by: string | null;
  forwarder_name: string | null;
  origin_port_name: string | null;
  destination_port_name: string | null;
  current_status: string;
  etd: string | null;
  eta: string | null;
  linked_po_count: number;
  pic_name: string | null;
  display_pt: string | null;
  display_plant: string | null;
  closed_at: string | null;
  linked_pos: ShipmentListLinkedPo[];
}

export interface ShipmentDetail {
  id: string;
  shipment_number: string;
  vendor_code: string | null;
  vendor_name: string | null;
  forwarder_code: string | null;
  forwarder_name: string | null;
  warehouse_code: string | null;
  warehouse_name: string | null;
  incoterm: string | null;
  shipment_method: string | null;
  origin_port_code: string | null;
  origin_port_name: string | null;
  origin_port_country: string | null;
  destination_port_code: string | null;
  destination_port_name: string | null;
  destination_port_country: string | null;
  etd: string | null;
  eta: string | null;
  /** Actual time of departure */
  atd: string | null;
  /** Actual time of arrival */
  ata: string | null;
  /** Depot drop: yes / no */
  depo: boolean | null;
  depo_location: string | null;
  current_status: string;
  closed_at: string | null;
  close_reason: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  pic_name: string | null;
  pib_type: string | null;
  no_request_pib: string | null;
  nopen: string | null;
  nopen_date: string | null;
  ship_by: string | null;
  bl_awb: string | null;
  insurance_no: string | null;
  coo: string | null;
  incoterm_amount: number | null;
  cbm: number | null;
  net_weight_mt: number | null;
  gross_weight_mt: number | null;
  bm_percentage: number | null;
  kawasan_berikat: string | null;
  /** Yes / No */
  surveyor: string | null;
  /** Chemical, Packaging, or Spare Parts */
  product_classification: string | null;
  /** Pre-shipment unit options (container / package). */
  unit_20ft: boolean;
  unit_40ft: boolean;
  unit_package: boolean;
  unit_20_iso_tank: boolean;
  container_count_20ft: number | null;
  container_count_40ft: number | null;
  /** LCL: package quantity when unit_package is true */
  package_count: number | null;
  /** FCL: 20′ ISO tank quantity when unit_20_iso_tank is true */
  container_count_20_iso_tank: number | null;
  /** Total PO amount in IDR for this shipment: Σ((delivered_qty × unit_price) × currency_rate). */
  total_items_amount: number;
  /** BM = (bm_percentage / 100) × total_items_amount (system-calculated). */
  bm: number;
  /** Effective PPN rate (%) from server (PPN_PERCENTAGE). */
  ppn_percentage: number;
  ppn: number;
  /** Effective PPH rate (%) from server (PPH_PERCENTAGE). */
  pph_percentage: number;
  pph: number;
  /** PDRI = BM + PPN + PPH */
  pdri: number;
  linked_pos: LinkedPoSummary[];
}

/** Comment on a shipment (GET/POST /shipments/:id/notes). Newest first from API. */
export interface ShipmentNote {
  id: string;
  shipment_id: string;
  note: string;
  created_by_user_id: string | null;
  created_by_name: string;
  created_at: string;
}

/** GET/POST /shipments/:id/documents — files stored locally on server (storage_key). */
export interface ShipmentDocumentListItem {
  id: string;
  shipment_id: string;
  document_type: string;
  status: string | null;
  /** PO: linked PO intake; other types are null (legacy packing rows may still have intake_id). */
  intake_id: string | null;
  po_number: string | null;
  original_file_name: string;
  mime_type: string | null;
  size_bytes: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ListShipmentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplier_name?: string;
  po_number?: string;
  from_date?: string;
  to_date?: string;
  /** Effective PO date: `imported_po_intake.po_date`, else intake created date (UTC). */
  po_from_date?: string;
  po_to_date?: string;
  /**
   * Matches backend: not closed (`closed_at` null) and status not DELIVERED.
   * Use for KPIs such as dashboard “active” shipment count.
   */
  active_pipeline?: boolean;
}

export interface ShipmentTimelineEntry {
  sequence: number;
  status: string;
  changed_at: string;
  changed_by: string;
  remarks: string | null;
}

export interface ShipmentStatusSummaryData {
  current_status: string;
  previous_status: string | null;
  last_updated_at: string;
}

export type ShipmentActivityType =
  | "shipment_created"
  | "status_change"
  | "note"
  | "couple_po"
  | "decouple_po"
  | "shipment_updated";

export interface ShipmentActivityItem {
  id: string;
  type: ShipmentActivityType;
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

export interface ShipmentBid {
  id: string;
  shipment_id: string;
  forwarder_name: string;
  service_amount: number | null;
  duration: string | null;
  origin_port: string | null;
  destination_port: string | null;
  ship_via: string | null;
  quotation_file_name: string | null;
  quotation_storage_key: string | null;
  created_at: string;
  updated_at: string;
}
