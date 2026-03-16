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
