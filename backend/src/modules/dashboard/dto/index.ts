/**
 * Dashboard DTOs (API Spec §5.9).
 */

/** GET /dashboard/import-summary response data */
export interface ImportSummaryData {
  total_transactions: number;
  in_progress: number;
  delivered: number;
  delayed: number;
}

/** GET /dashboard/import-status-summary response item */
export interface StatusCountItem {
  status: string;
  count: number;
}
