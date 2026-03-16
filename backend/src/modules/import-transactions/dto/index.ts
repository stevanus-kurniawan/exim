/**
 * Import transaction DTOs (API Spec §5.4).
 */

/** Create request body. */
export interface CreateImportTransactionDto {
  po_number: string;
  purchase_request_number?: string;
  item_name?: string;
  item_category?: string;
  supplier_name: string;
  supplier_country?: string;
  incoterm?: string;
  currency?: string;
  estimated_value?: number;
  origin_port_code: string;
  origin_port_name?: string;
  destination_port_code: string;
  destination_port_name?: string;
  eta: string;
  remarks?: string;
}

/** Update request body (partial). */
export interface UpdateImportTransactionDto {
  eta?: string;
  remarks?: string;
}

/** Close request body. */
export interface CloseImportTransactionDto {
  reason?: string;
}

/** List query params. */
export interface ListImportTransactionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  supplier_name?: string;
  po_number?: string;
  from_date?: string;
  to_date?: string;
}

/** DB row shape. */
export interface ImportTransactionRow {
  id: string;
  transaction_no: string;
  vendor_code: string | null;
  vendor_name: string | null;
  supplier_country: string | null;
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
  po_number: string | null;
  purchase_request_number: string | null;
  item_name: string | null;
  item_category: string | null;
  currency: string | null;
  estimated_value: number | null;
  created_at: Date;
  updated_at: Date;
}

/** Single transaction for list item. */
export interface ImportTransactionListItem {
  id: string;
  transaction_number: string;
  po_number: string | null;
  supplier_name: string | null;
  origin_port_name: string | null;
  destination_port_name: string | null;
  current_status: string;
  eta: string | null;
}

/** Full detail for GET /:id. */
export interface ImportTransactionDetail {
  id: string;
  transaction_number: string;
  po_number: string | null;
  purchase_request_number: string | null;
  item_name: string | null;
  item_category: string | null;
  supplier_name: string | null;
  supplier_country: string | null;
  incoterm: string | null;
  currency: string | null;
  estimated_value: number | null;
  origin_port_code: string | null;
  origin_port_name: string | null;
  destination_port_code: string | null;
  destination_port_name: string | null;
  eta: string | null;
  current_status: string;
  created_at: string;
  updated_at: string;
}

/** Create response data. */
export interface CreateImportTransactionResponse {
  id: string;
  transaction_number: string;
  po_number: string | null;
  current_status: string;
  created_at: string;
}
