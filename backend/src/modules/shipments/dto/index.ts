/**
 * Shipment DTOs. Main operational entity; status timeline; PO mapping.
 */

export const SHIPMENT_STATUSES = [
  "INITIATE_SHIPPING_DOCUMENT",
  "BIDDING_TRANSPORTER",
  "TRANSPORT_CONFIRMED",
  "READY_PICKUP",
  "PICKED_UP",
  "ON_SHIPMENT",
  "CUSTOMS_CLEARANCE",
  "DELIVERED",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export interface CreateShipmentDto {
  vendor_code?: string;
  vendor_name?: string;
  forwarder_code?: string;
  forwarder_name?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  incoterm?: string;
  shipment_method?: string;
  origin_port_code?: string;
  origin_port_name?: string;
  origin_port_country?: string;
  destination_port_code?: string;
  destination_port_name?: string;
  destination_port_country?: string;
  etd?: string;
  eta?: string;
  remarks?: string;
  pib_type?: string;
  no_request_pib?: string;
  ppjk_mkl?: string;
  nopen?: string;
  nopen_date?: string;
  ship_by?: string;
  bl_awb?: string;
  insurance_no?: string;
  coo?: string;
  incoterm_amount?: number;
  cbm?: number | null;
  bm_percentage?: number;
  /** PPN % of (total invoice + BM); omit/null uses env default. */
  ppn_percentage?: number | null;
  /** PPH % of (total invoice + BM); omit/null uses env default. */
  pph_percentage?: number | null;
  kawasan_berikat?: string;
  product_classification?: string;
}

export interface UpdateShipmentDto {
  etd?: string;
  eta?: string;
  atd?: string;
  ata?: string;
  depo?: boolean;
  depo_location?: string | null;
  remarks?: string;
  pib_type?: string;
  no_request_pib?: string;
  ppjk_mkl?: string;
  nopen?: string;
  nopen_date?: string;
  /** Null clears ship_by (e.g. when Ship via is Air). */
  ship_by?: string | null;
  bl_awb?: string;
  insurance_no?: string;
  coo?: string;
  incoterm_amount?: number;
  cbm?: number | null;
  net_weight_mt?: number;
  gross_weight_mt?: number;
  bm_percentage?: number;
  ppn_percentage?: number | null;
  pph_percentage?: number | null;
  origin_port_name?: string;
  origin_port_country?: string;
  forwarder_name?: string;
  shipment_method?: string;
  destination_port_name?: string;
  destination_port_country?: string;
  vendor_name?: string;
  warehouse_name?: string;
  incoterm?: string;
  closed_at?: string;
  close_reason?: string;
  kawasan_berikat?: string | null;
  surveyor?: string | null;
  product_classification?: string | null;
  unit_20ft?: boolean;
  unit_40ft?: boolean;
  unit_package?: boolean;
  unit_20_iso_tank?: boolean;
  container_count_20ft?: number | null;
  container_count_40ft?: number | null;
  package_count?: number | null;
  container_count_20_iso_tank?: number | null;
}

export interface CloseShipmentDto {
  reason?: string;
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
  /** Inclusive; filters shipments that have at least one active linked PO whose effective PO date is on or after this day (uses `Import_purchase_order.po_date`, else intake `created_at` UTC date). */
  po_from_date?: string;
  /** Inclusive; same semantics as `po_from_date` for upper bound. */
  po_to_date?: string;
  /**
   * When true (e.g. `active_pipeline=true`), only shipments that are still open for operations:
   * `closed_at IS NULL` and `current_status <> 'DELIVERED'`.
   */
  active_pipeline?: boolean;
}

/** Line summary for shipment list PO expansion. */
export interface ShipmentListPoLineItem {
  item_description: string | null;
  /** Quantity on the PO line. */
  qty_po: number | null;
  /** Quantity delivered on this shipment for this line; null if not recorded. */
  delivery_qty: number | null;
  unit: string | null;
}

/** Linked PO block returned on shipment list (for multi-PO expand). */
export interface ShipmentListLinkedPo {
  intake_id: string;
  po_number: string;
  pt: string | null;
  plant: string | null;
  taken_by_name: string | null;
  /** PO intake currency — same grouping key as couple validation. */
  currency: string | null;
  intake_status: string | null;
  items: ShipmentListPoLineItem[];
}

export interface ShipmentRow {
  id: string;
  shipment_no: string;
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
  etd: Date | null;
  eta: Date | null;
  atd: Date | null;
  ata: Date | null;
  depo: boolean | null;
  depo_location: string | null;
  current_status: string;
  closed_at: Date | null;
  close_reason: string | null;
  remarks: string | null;
  created_at: Date;
  updated_at: Date;
  pib_type: string | null;
  no_request_pib: string | null;
  ppjk_mkl: string | null;
  nopen: string | null;
  nopen_date: Date | null;
  ship_by: string | null;
  bl_awb: string | null;
  insurance_no: string | null;
  coo: string | null;
  incoterm_amount: number | null;
  cbm: number | null;
  net_weight_mt: number | null;
  gross_weight_mt: number | null;
  bm: number | null;
  bm_percentage: number | null;
  ppn_percentage: number | null;
  pph_percentage: number | null;
  kawasan_berikat: string | null;
  surveyor: string | null;
  product_classification: string | null;
  unit_20ft: boolean;
  unit_40ft: boolean;
  unit_package: boolean;
  unit_20_iso_tank: boolean;
  container_count_20ft: number | null;
  container_count_40ft: number | null;
  package_count: number | null;
  container_count_20_iso_tank: number | null;
}

export interface ShipmentListItem {
  id: string;
  shipment_number: string;
  supplier_name: string | null;
  /** Same as vendor on shipment; kept for list column "Vendor". */
  vendor_name: string | null;
  /** Shipment incoterm (from shipment detail). */
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
  /** Full name of user who took ownership of linked PO. */
  pic_name: string | null;
  /** PT / plant shown on the row: first linked PO when multiple may differ. */
  display_pt: string | null;
  display_plant: string | null;
  /** When set, shipment is closed — cannot couple additional POs. */
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
  atd: string | null;
  ata: string | null;
  depo: boolean | null;
  depo_location: string | null;
  current_status: string;
  closed_at: string | null;
  close_reason: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  /** Full name of user who took ownership of linked PO. */
  pic_name: string | null;
  pib_type: string | null;
  no_request_pib: string | null;
  ppjk_mkl: string | null;
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
  kawasan_berikat: string | null;
  surveyor: string | null;
  product_classification: string | null;
  bm_percentage: number | null;
  unit_20ft: boolean;
  unit_40ft: boolean;
  unit_package: boolean;
  unit_20_iso_tank: boolean;
  container_count_20ft: number | null;
  container_count_40ft: number | null;
  package_count: number | null;
  container_count_20_iso_tank: number | null;
  /** Sum in IDR: all linked POs share currency & rate — IDR/RP = Σ(qty×price); else Σ(qty×price) × group currency_rate. */
  total_items_amount: number;
  /** BM = (bm_percentage / 100) × total_items_amount (system-calculated). */
  bm: number;
  /** Shipment-specific PPN %; null means `duty_percentage_defaults.ppn` is used in formulas. */
  ppn_percentage: number | null;
  /** Shipment-specific PPH %; null means `duty_percentage_defaults.pph` is used in formulas. */
  pph_percentage: number | null;
  /** Env-based defaults when row PPN/PPH % are null (read-only). */
  duty_percentage_defaults: { ppn: number; pph: number };
  /** PPN = (effective PPN %) / 100 × (total_items_amount + BM). */
  ppn: number;
  /** PPH = (effective PPH %) / 100 × (total_items_amount + BM). */
  pph: number;
  /** PDRI = BM + PPN + PPH */
  pdri: number;
  linked_pos: LinkedPoSummary[];
}

export interface LinkedPoLineReceived {
  item_id: string;
  received_qty: number;
}

export interface LinkedPoSummary {
  intake_id: string;
  po_number: string;
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

export interface CreateShipmentResponse {
  id: string;
  shipment_number: string;
  current_status: string;
  created_at: string;
}

export interface UpdateStatusDto {
  new_status: string;
  remarks?: string;
}

export interface CouplePoDto {
  intake_ids: string[];
}

export interface DecouplePoDto {
  intake_id: string;
  reason?: string;
}

export interface ShipmentStatusHistoryRow {
  id: string;
  shipment_id: string;
  previous_status: string | null;
  new_status: string;
  remarks: string | null;
  changed_by: string;
  changed_at: Date;
}

export interface TimelineEntry {
  sequence: number;
  status: string;
  changed_at: string;
  changed_by: string;
  remarks: string | null;
}

/** Unified activity log row (status, notes, PO link/unlink, creation). */
export interface ShipmentActivityItem {
  id: string;
  type:
    | "shipment_created"
    | "status_change"
    | "note"
    | "couple_po"
    | "decouple_po"
    | "shipment_updated";
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

export interface StatusSummaryData {
  current_status: string;
  previous_status: string | null;
  last_updated_at: string;
}

export interface UpdateStatusResponseData {
  shipment_id: string;
  previous_status: string;
  current_status: string;
  updated_at: string;
}

export interface ShipmentPoMappingRow {
  id: string;
  shipment_id: string;
  intake_id: string;
  coupled_at: Date;
  coupled_by: string;
  decoupled_at: Date | null;
  decoupled_by: string | null;
  decouple_reason: string | null;
}

export interface ShipmentBidRow {
  id: string;
  shipment_id: string;
  forwarder_name: string;
  service_amount: number | null;
  duration: string | null;
  /** Calendar expiry for quotation validity (optional). */
  quotation_expires_at: Date | null;
  origin_port: string | null;
  destination_port: string | null;
  ship_via: string | null;
  quotation_file_name: string | null;
  quotation_storage_key: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateShipmentBidDto {
  forwarder_name: string;
  service_amount?: number;
  duration?: string;
  /** YYYY-MM-DD; optional. */
  quotation_expires_at?: string | null;
  origin_port?: string;
  destination_port?: string;
  ship_via?: string;
}

export interface UpdateShipmentBidDto {
  forwarder_name?: string;
  service_amount?: number;
  duration?: string;
  quotation_expires_at?: string | null;
  origin_port?: string;
  destination_port?: string;
  ship_via?: string;
  quotation_file_name?: string;
  quotation_storage_key?: string;
}

export interface ShipmentCsvImportErrorRow {
  row: number;
  field: string;
  shipment_no: string;
  po_number: string;
  message: string;
}

export interface ShipmentCsvImportResult {
  total_rows: number;
  imported_shipments: number;
  imported_rows: number;
  failed_rows: number;
  errors: ShipmentCsvImportErrorRow[];
}

