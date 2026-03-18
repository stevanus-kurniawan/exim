/**
 * Shipment bids repository: CRUD for bidding transporter participants.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type {
  ShipmentBidRow,
  CreateShipmentBidDto,
  UpdateShipmentBidDto,
} from "../dto/index.js";

const COLUMNS =
  "id, shipment_id, forwarder_name, service_amount, duration, origin_port, destination_port, ship_via, quotation_file_name, quotation_storage_key, created_at, updated_at";

export class ShipmentBidRepository {
  private get pool(): Pool {
    return getPool();
  }

  async findByShipmentId(shipmentId: string): Promise<ShipmentBidRow[]> {
    const result = await this.pool.query<ShipmentBidRow>(
      `SELECT ${COLUMNS} FROM shipment_bids WHERE shipment_id = $1 ORDER BY created_at ASC`,
      [shipmentId]
    );
    return result.rows;
  }

  async findById(id: string): Promise<ShipmentBidRow | null> {
    const result = await this.pool.query<ShipmentBidRow>(
      `SELECT ${COLUMNS} FROM shipment_bids WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async create(shipmentId: string, dto: CreateShipmentBidDto): Promise<ShipmentBidRow> {
    const result = await this.pool.query<ShipmentBidRow>(
      `INSERT INTO shipment_bids (shipment_id, forwarder_name, service_amount, duration, origin_port, destination_port, ship_via, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [
        shipmentId,
        dto.forwarder_name.trim(),
        dto.service_amount ?? null,
        dto.duration?.trim() ?? null,
        dto.origin_port?.trim() ?? null,
        dto.destination_port?.trim() ?? null,
        dto.ship_via?.trim() ?? null,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, dto: UpdateShipmentBidDto): Promise<ShipmentBidRow | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [];
    let idx = 1;
    if (dto.forwarder_name !== undefined) {
      updates.push(`forwarder_name = $${idx++}`);
      params.push(dto.forwarder_name.trim());
    }
    if (dto.service_amount !== undefined) {
      updates.push(`service_amount = $${idx++}`);
      params.push(dto.service_amount);
    }
    if (dto.duration !== undefined) {
      updates.push(`duration = $${idx++}`);
      params.push(dto.duration.trim() || null);
    }
    if (dto.origin_port !== undefined) {
      updates.push(`origin_port = $${idx++}`);
      params.push(dto.origin_port.trim() || null);
    }
    if (dto.destination_port !== undefined) {
      updates.push(`destination_port = $${idx++}`);
      params.push(dto.destination_port.trim() || null);
    }
    if (dto.ship_via !== undefined) {
      updates.push(`ship_via = $${idx++}`);
      params.push(dto.ship_via.trim() || null);
    }
    if (dto.quotation_file_name !== undefined) {
      updates.push(`quotation_file_name = $${idx++}`);
      params.push(dto.quotation_file_name || null);
    }
    if (dto.quotation_storage_key !== undefined) {
      updates.push(`quotation_storage_key = $${idx++}`);
      params.push(dto.quotation_storage_key || null);
    }
    if (params.length === 1) return this.findById(id);
    params.push(id);
    const result = await this.pool.query<ShipmentBidRow>(
      `UPDATE shipment_bids SET ${updates.join(", ")} WHERE id = $${idx} RETURNING ${COLUMNS}`,
      params
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM shipment_bids WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}
