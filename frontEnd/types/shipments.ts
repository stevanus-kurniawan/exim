/**
 * Shipments API types — align with backend GET /shipments, GET /shipments/:id.
 */

export interface LinkedPoLineReceived {
  item_id: string;
  received_qty: number;
}

export interface LinkedPoSummary {
  intake_id: string;
  po_number: string;
  plant: string | null;
  supplier_name: string;
  incoterm_location: string | null;
  currency: string | null;
  invoice_no: string | null;
  currency_rate: number | null;
  coupled_at: string;
  coupled_by: string;
  line_received: LinkedPoLineReceived[];
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
  bm_percentage: number | null;
  kawasan_berikat: string | null;
  /** Total amount of all items (linked POs). PPN/PPH/PDRI derived from this. */
  total_items_amount: number;
  /** PPN = 11% × total_items_amount */
  ppn: number;
  /** PPH = 2.5% × total_items_amount */
  pph: number;
  /** PDRI = BM + PPN + PPH */
  pdri: number;
  linked_pos: LinkedPoSummary[];
}

export interface ListShipmentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplier_name?: string;
  po_number?: string;
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
