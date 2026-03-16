/**
 * Dashboard repository: read-only aggregate queries. Efficient, easy to extend.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";

export interface ImportSummaryRow {
  total_transactions: string;
  in_progress: string;
  delivered: string;
  delayed: string;
}

export interface StatusCountRow {
  status: string;
  count: string;
}

export class DashboardRepository {
  private get pool(): Pool {
    return getPool();
  }

  /** Single query for summary counts. Extend with more metrics as needed. */
  async getImportSummary(): Promise<ImportSummaryRow> {
    const result = await this.pool.query<ImportSummaryRow>(`
      SELECT
        COUNT(*)::text AS total_transactions,
        COUNT(*) FILTER (WHERE closed_at IS NULL AND current_status != 'DELIVERED')::text AS in_progress,
        COUNT(*) FILTER (WHERE current_status = 'DELIVERED')::text AS delivered,
        COUNT(*) FILTER (WHERE closed_at IS NULL AND current_status != 'DELIVERED' AND eta IS NOT NULL AND eta < NOW())::text AS delayed
      FROM import_transactions
    `);
    return result.rows[0] ?? {
      total_transactions: "0",
      in_progress: "0",
      delivered: "0",
      delayed: "0",
    };
  }

  /** Count by current_status. Index on current_status keeps this efficient. */
  async getImportStatusSummary(): Promise<StatusCountRow[]> {
    const result = await this.pool.query<StatusCountRow>(`
      SELECT current_status AS status, COUNT(*)::text AS count
      FROM import_transactions
      WHERE closed_at IS NULL
      GROUP BY current_status
      ORDER BY current_status
    `);
    return result.rows;
  }
}
