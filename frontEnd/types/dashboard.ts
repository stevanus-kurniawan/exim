/** GET /dashboard/delivered-management — one row per delivered shipment in the period. */
export interface DeliveredManagementItem {
  shipment_id: string;
  shipment_number: string;
  pt: string | null;
  plant: string | null;
  product_classification: string | null;
  vendor_name: string | null;
  total_amount_idr: number;
  freight_charge: number | null;
  total_qty: number;
}

export interface DeliveredManagementQuery {
  month?: number;
  year?: number;
}
/**
 * Dashboard API types — align with backend GET /dashboard/import-summary, import-status-summary.
 */

export interface ImportSummaryData {
  total_transactions: number;
  in_progress: number;
  delivered: number;
  delayed: number;
}

export interface StatusCountItem {
  status: string;
  count: number;
}
