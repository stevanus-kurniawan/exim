export interface ProductSpecificationSummaryItem {
  product_specification: string;
  vendor_name: string | null;
  pt: string | null;
  plant: string | null;
  delivered_qty: number;
}

export interface ProductSpecificationSummaryQuery {
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
