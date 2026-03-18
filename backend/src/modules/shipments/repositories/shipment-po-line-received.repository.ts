/**
 * Per-shipment per-PO-line received quantity. 1 PO can be delivered across multiple shipments.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";

export interface LineReceivedRow {
  item_id: string;
  received_qty: number;
}

export class ShipmentPoLineReceivedRepository {
  private get pool(): Pool {
    return getPool();
  }

  async findByShipmentAndIntake(shipmentId: string, intakeId: string): Promise<LineReceivedRow[]> {
    const result = await this.pool.query<LineReceivedRow>(
      `SELECT item_id, received_qty FROM shipment_po_line_received
       WHERE shipment_id = $1 AND intake_id = $2`,
      [shipmentId, intakeId]
    );
    return result.rows;
  }

  /** Total received qty for this (intake, item) across all shipments (for validation). */
  async getTotalReceivedByIntakeItem(intakeId: string, itemId: string): Promise<number> {
    const result = await this.pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(received_qty), 0)::text AS total
       FROM shipment_po_line_received WHERE intake_id = $1 AND item_id = $2`,
      [intakeId, itemId]
    );
    const total = result.rows[0]?.total;
    return total != null ? parseFloat(total) : 0;
  }

  /** Set received qty for one line. Inserts or updates. */
  async upsert(shipmentId: string, intakeId: string, itemId: string, receivedQty: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO shipment_po_line_received (shipment_id, intake_id, item_id, received_qty, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (shipment_id, intake_id, item_id) DO UPDATE SET received_qty = $4, updated_at = NOW()`,
      [shipmentId, intakeId, itemId, receivedQty]
    );
  }

  /** Set received qtys for all lines of one PO on this shipment. Replaces existing. */
  async setLines(
    shipmentId: string,
    intakeId: string,
    lines: { item_id: string; received_qty: number }[]
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `DELETE FROM shipment_po_line_received WHERE shipment_id = $1 AND intake_id = $2`,
        [shipmentId, intakeId]
      );
      for (const line of lines) {
        await client.query(
          `INSERT INTO shipment_po_line_received (shipment_id, intake_id, item_id, received_qty, updated_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [shipmentId, intakeId, line.item_id, line.received_qty]
        );
      }
    } finally {
      client.release();
    }
  }
}
