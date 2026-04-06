import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";

export interface DeliveredManagementQuery {
  month?: number;
  year?: number;
}

/** One row per delivered shipment in the selected period (management dashboard). */
export interface DeliveredManagementRow {
  shipment_id: string;
  shipment_number: string;
  pt: string | null;
  plant: string | null;
  product_classification: string | null;
  vendor_name: string | null;
  /** Delivered line value in IDR (same rules as shipment detail total_items_amount). */
  total_amount_idr: number;
  /** Freight / service & charge from shipment (incoterm_amount). */
  freight_charge: number | null;
  /** Sum of received quantities across all coupled PO lines on the shipment. */
  total_qty: number;
}

export class DashboardRepository {
  private get pool(): Pool {
    return getPool();
  }

  /**
   * Delivered shipments in month/year (on closed/ata/updated date), with:
   * - PT / plant from primary linked PO (lowest po_number among active mappings)
   * - total_amount_idr: Σ(qty × unit_price) in IDR (FX via mapping currency_rate when PO is not IDR/RP)
   * - freight_charge: shipment.incoterm_amount
   * - total_qty: Σ(received_qty)
   * Shipments with no line rows still appear (amount/qty 0).
   */
  async getDeliveredManagementSummary(query: DeliveredManagementQuery): Promise<DeliveredManagementRow[]> {
    const conditions: string[] = ["s.current_status = 'DELIVERED'"];
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

    const shipmentWhere = conditions.join(" AND ");

    const pcExpr = `(CASE TRIM(b.product_classification)
        WHEN 'Checmical' THEN 'Chemical'
        WHEN 'Packaging' THEN 'Package'
        ELSE NULLIF(TRIM(b.product_classification), '')
      END)`;

    const result = await this.pool.query<{
      shipment_id: string;
      shipment_number: string;
      pt: string | null;
      plant: string | null;
      product_classification: string | null;
      vendor_name: string | null;
      total_amount_idr: string;
      freight_charge: string | null;
      total_qty: string;
    }>(
      `WITH base AS (
        SELECT
          s.id AS shipment_id,
          s.shipment_no AS shipment_number,
          s.vendor_name,
          s.product_classification,
          s.incoterm_amount
        FROM shipments s
        WHERE ${shipmentWhere}
      ),
      lines AS (
        SELECT
          b.shipment_id,
          COALESCE(r.received_qty, 0)::numeric AS qty,
          COALESCE(it.unit_price, 0)::numeric AS unit_price,
          po.currency,
          m.currency_rate
        FROM base b
        INNER JOIN shipment_po_mapping m
          ON m.shipment_id = b.shipment_id AND m.decoupled_at IS NULL
        INNER JOIN shipment_po_line_received r
          ON r.shipment_id = m.shipment_id AND r.intake_id = m.intake_id
        INNER JOIN Import_purchase_order_items it
          ON it.id = r.item_id AND it.intake_id = r.intake_id
        INNER JOIN Import_purchase_order po
          ON po.id = r.intake_id
      ),
      amounts AS (
        SELECT
          shipment_id,
          qty,
          (qty * unit_price * CASE
            WHEN UPPER(TRIM(COALESCE(currency, ''))) IN ('IDR', 'RP') THEN 1::numeric
            ELSE COALESCE(NULLIF(currency_rate, 0), 1)::numeric
          END) AS amount_idr
        FROM lines
      ),
      line_sums AS (
        SELECT
          shipment_id,
          SUM(qty) AS total_qty,
          SUM(amount_idr) AS total_amount_idr
        FROM amounts
        GROUP BY shipment_id
      ),
      primary_po AS (
        SELECT DISTINCT ON (m.shipment_id)
          m.shipment_id,
          NULLIF(TRIM(i.pt), '') AS pt,
          NULLIF(TRIM(i.plant), '') AS plant
        FROM shipment_po_mapping m
        INNER JOIN Import_purchase_order i ON i.id = m.intake_id
        INNER JOIN base b ON b.shipment_id = m.shipment_id
        WHERE m.decoupled_at IS NULL
        ORDER BY m.shipment_id, i.po_number ASC NULLS LAST, i.created_at ASC
      )
      SELECT
        b.shipment_id,
        b.shipment_number,
        pp.pt,
        pp.plant,
        ${pcExpr} AS product_classification,
        NULLIF(TRIM(b.vendor_name), '') AS vendor_name,
        COALESCE(ls.total_amount_idr, 0)::text AS total_amount_idr,
        b.incoterm_amount::text AS freight_charge,
        COALESCE(ls.total_qty, 0)::text AS total_qty
      FROM base b
      LEFT JOIN line_sums ls ON ls.shipment_id = b.shipment_id
      LEFT JOIN primary_po pp ON pp.shipment_id = b.shipment_id
      ORDER BY b.shipment_number DESC`,
      params
    );

    return result.rows.map((row) => ({
      shipment_id: row.shipment_id,
      shipment_number: row.shipment_number,
      pt: row.pt,
      plant: row.plant,
      product_classification: row.product_classification,
      vendor_name: row.vendor_name,
      total_amount_idr: parseFloat(row.total_amount_idr),
      freight_charge: row.freight_charge != null ? parseFloat(row.freight_charge) : null,
      total_qty: parseFloat(row.total_qty),
    }));
  }
}
