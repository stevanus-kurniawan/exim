import type { DeliveredManagementQuery, DeliveredManagementRow } from "../repositories/dashboard.repository.js";
import { DashboardRepository } from "../repositories/dashboard.repository.js";

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async getDeliveredManagementSummary(query: DeliveredManagementQuery): Promise<DeliveredManagementRow[]> {
    return this.repo.getDeliveredManagementSummary(query);
  }
}
