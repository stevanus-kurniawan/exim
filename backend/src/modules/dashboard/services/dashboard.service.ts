import type {
  ProductSpecificationSummaryQuery,
  ProductSpecificationSummaryRow,
} from "../repositories/dashboard.repository.js";
import { DashboardRepository } from "../repositories/dashboard.repository.js";

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async getProductSpecificationSummary(
    query: ProductSpecificationSummaryQuery
  ): Promise<ProductSpecificationSummaryRow[]> {
    return this.repo.getProductSpecificationSummary(query);
  }
}
