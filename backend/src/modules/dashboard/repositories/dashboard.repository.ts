import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";

export interface ProductSpecificationSummaryQuery {
  month?: number;
  year?: number;
}

export interface ProductSpecificationSummaryRow {
  product_specification: string;
  vendor_name: string | null;
  pt: string | null;
  plant: string | null;
  delivered_qty: number;
}

export class DashboardRepository {
  private get pool(): Pool {
    return getPool();
  }

  async getProductSpecificationSummary(
    query: ProductSpecificationSummaryQuery
  ): Promise<ProductSpecificationSummaryRow[]> {
    const conditions: string[] = [
      "m.decoupled_at IS NULL",
      "s.current_status = 'DELIVERED'",
      "s.product_classification IS NOT NULL",
      "TRIM(s.product_classification) <> ''",
    ];
    const params: unknown[] = [];
    let idx = 1;

    if (query.month != null) {
      conditions.push(`EXTRACT(MONTH FROM COALESCE(s.closed_at, s.ata, s.updated_at)) = $${idx++}`);
      params.push(query.month);
    }
    if (query.year != null) {
      conditions.push(`EXTRACT(YEAR FROM COALESCE(s.closed_at, s.ata, s.updated_at)) = $${idx++}`);
      params.push(query.year);
    }

    const where = conditions.join(" AND ");
    const result = await this.pool.query<{
      product_specification: string;
      vendor_name: string | null;
      pt: string | null;
      plant: string | null;
      delivered_qty: string;
    }>(
      `SELECT
         TRIM(s.product_classification) AS product_specification,
         NULLIF(TRIM(s.vendor_name), '') AS vendor_name,
         NULLIF(TRIM(i.pt), '') AS pt,
         NULLIF(TRIM(i.plant), '') AS plant,
         COALESCE(SUM(COALESCE(r.received_qty, 0)), 0)::text AS delivered_qty
       FROM shipment_po_line_received r
       JOIN shipments s
         ON s.id = r.shipment_id
       JOIN shipment_po_mapping m
         ON m.shipment_id = r.shipment_id
         AND m.intake_id = r.intake_id
       LEFT JOIN Import_purchase_order i
         ON i.id = r.intake_id
       WHERE ${where}
       GROUP BY
         TRIM(s.product_classification),
         NULLIF(TRIM(s.vendor_name), ''),
         NULLIF(TRIM(i.pt), ''),
         NULLIF(TRIM(i.plant), '')
       ORDER BY
         TRIM(s.product_classification) ASC,
         NULLIF(TRIM(s.vendor_name), '') ASC NULLS LAST,
         NULLIF(TRIM(i.pt), '') ASC NULLS LAST,
         NULLIF(TRIM(i.plant), '') ASC NULLS LAST`,
      params
    );

    return result.rows.map((row) => ({
      product_specification: row.product_specification,
      vendor_name: row.vendor_name,
      pt: row.pt,
      plant: row.plant,
      delivered_qty: parseFloat(row.delivered_qty),
    }));
  }
}
