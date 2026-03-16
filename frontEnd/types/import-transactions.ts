/**
 * Import transactions API types — align with backend GET /import-transactions list and detail.
 */

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

export interface ListImportTransactionsMeta {
  page: number;
  limit: number;
  total: number;
}

/** Full detail for GET /import-transactions/:id */
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

/** Timeline entry — GET /import-transactions/:id/timeline */
export interface TimelineEntry {
  sequence: number;
  status: string;
  changed_at: string;
  changed_by: string;
  remarks: string | null;
}

/** Status summary — GET /import-transactions/:id/status-summary */
export interface StatusSummaryData {
  current_status: string;
  previous_status: string | null;
  last_updated_at: string;
}

/** Document list item — GET /import-transactions/:id/documents */
export interface TransactionDocumentListItem {
  document_id: string;
  document_name: string;
  document_type: string;
  latest_version_number: number;
  latest_version_label: string;
  uploaded_at: string;
}

/** Upload document response — POST /import-transactions/:id/documents */
export interface UploadDocumentResponseData {
  document_id: string;
  document_name: string;
  document_type: string;
  current_version: number;
  version_label: string;
  file_name: string;
}

/** Note list item — GET /import-transactions/:id/notes */
export interface TransactionNoteListItem {
  note_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

/** Create import transaction — POST /import-transactions request body (API spec) */
export interface CreateImportTransactionPayload {
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
  eta?: string;
  remarks?: string;
}

/** Create import transaction — POST /import-transactions response data */
export interface CreateImportTransactionResponseData {
  id: string;
  transaction_number: string;
  po_number: string;
  current_status: string;
  created_at: string;
}
