/**
 * Dashboard service: aggregate logic. No HTTP, no raw SQL.
 */

import { DashboardRepository } from "../repositories/dashboard.repository.js";
import type { ImportSummaryData, StatusCountItem } from "../dto/index.js";

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async getImportSummary(): Promise<ImportSummaryData> {
    const row = await this.repo.getImportSummary();
    return {
      total_transactions: parseInt(row.total_transactions, 10) || 0,
      in_progress: parseInt(row.in_progress, 10) || 0,
      delivered: parseInt(row.delivered, 10) || 0,
      delayed: parseInt(row.delayed, 10) || 0,
    };
  }

  async getImportStatusSummary(): Promise<StatusCountItem[]> {
    const rows = await this.repo.getImportStatusSummary();
    return rows.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10) || 0,
    }));
  }
}
