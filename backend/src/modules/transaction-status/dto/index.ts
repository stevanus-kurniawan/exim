/**
 * Transaction status / timeline DTOs (API Spec §5.5).
 */

/** Allowed status flow (cursor-rules, API Spec §4). */
export const IMPORT_TRANSACTION_STATUSES = [
  "INITIATE_SHIPPING_DOCUMENT",
  "BIDDING_TRANSPORTER",
  "TRANSPORT_CONFIRMED",
  "READY_PICKUP",
  "PICKED_UP",
  "ON_SHIPMENT",
  "CUSTOMS_CLEARANCE",
  "DELIVERED",
] as const;

export type ImportTransactionStatus = (typeof IMPORT_TRANSACTION_STATUSES)[number];

/** Update status request body. */
export interface UpdateStatusDto {
  new_status: string;
  remarks?: string;
}

/** DB row: status history. */
export interface StatusHistoryRow {
  id: string;
  transaction_id: string;
  previous_status: string | null;
  new_status: string;
  remarks: string | null;
  changed_by: string;
  changed_at: Date;
}

/** Timeline entry (API response). */
export interface TimelineEntry {
  sequence: number;
  status: string;
  changed_at: string;
  changed_by: string;
  remarks: string | null;
}

/** Update status response data. */
export interface UpdateStatusResponseData {
  transaction_id: string;
  previous_status: string;
  current_status: string;
  updated_at: string;
}

/** Status summary response data. */
export interface StatusSummaryData {
  current_status: string;
  previous_status: string | null;
  last_updated_at: string;
}
