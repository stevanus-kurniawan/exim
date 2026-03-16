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
  nopen?: string;
  nopen_date?: string;
  ship_by?: string;
  bl_awb?: string;
  insurance_no?: string;
  coo?: string;
  incoterm_amount?: number;
  bm?: number;
}

export interface UpdateShipmentDto {
  eta?: string;
  remarks?: string;
  pib_type?: string;
  no_request_pib?: string;
  nopen?: string;
  nopen_date?: string;
  ship_by?: string;
  bl_awb?: string;
  insurance_no?: string;
  coo?: string;
  incoterm_amount?: number;
  bm?: number;
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
  current_status: string;
  closed_at: Date | null;
  close_reason: string | null;
  remarks: string | null;
  created_at: Date;
  updated_at: Date;
  pib_type: string | null;
  no_request_pib: string | null;
  nopen: string | null;
  nopen_date: Date | null;
  ship_by: string | null;
  bl_awb: string | null;
  insurance_no: string | null;
  coo: string | null;
  incoterm_amount: number | null;
  bm: number | null;
}

export interface ShipmentListItem {
  id: string;
  shipment_number: string;
  supplier_name: string | null;
  origin_port_name: string | null;
  destination_port_name: string | null;
  current_status: string;
  eta: string | null;
  linked_po_count?: number;
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
  current_status: string;
  closed_at: string | null;
  close_reason: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  pib_type: string | null;
  no_request_pib: string | null;
  nopen: string | null;
  nopen_date: string | null;
  ship_by: string | null;
  bl_awb: string | null;
  insurance_no: string | null;
  coo: string | null;
  incoterm_amount: number | null;
  bm: number | null;
  /** Total amount of all items (linked POs). Used for PPN/PPH/PDRI. */
  total_items_amount: number;
  /** PPN = 11% × total_items_amount */
  ppn: number;
  /** PPH = 2.5% × total_items_amount */
  pph: number;
  /** PDRI = BM + PPN + PPH (BM is 0 when COO is null) */
  pdri: number;
  linked_pos: LinkedPoSummary[];
}

export interface LinkedPoSummary {
  intake_id: string;
  po_number: string;
  plant: string | null;
  supplier_name: string;
  incoterm_location: string | null;
  coupled_at: string;
  coupled_by: string;
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
