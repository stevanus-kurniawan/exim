/**
 * Shipment-PO mapping repository: couple/decouple with audit trail.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type { ShipmentPoMappingRow } from "../dto/index.js";

export interface LinkedPoWithIntake {
  intake_id: string;
  po_number: string;
  plant: string | null;
  supplier_name: string;
  incoterm_location: string | null;
  coupled_at: Date;
  coupled_by: string;
}

export class ShipmentPoMappingRepository {
  private get pool(): Pool {
    return getPool();
  }

  /** Currently coupled mappings only (decoupled_at IS NULL). */
  async findActiveByShipmentId(shipmentId: string): Promise<LinkedPoWithIntake[]> {
    const result = await this.pool.query<LinkedPoWithIntake>(
      `SELECT m.intake_id, i.po_number, i.plant, i.supplier_name, i.incoterm_location, m.coupled_at, m.coupled_by
       FROM shipment_po_mapping m
       JOIN imported_po_intake i ON i.id = m.intake_id
       WHERE m.shipment_id = $1 AND m.decoupled_at IS NULL
       ORDER BY m.coupled_at ASC`,
      [shipmentId]
    );
    return result.rows;
  }

  /** Count currently coupled POs for a shipment. */
  async countActiveByShipmentId(shipmentId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM shipment_po_mapping
       WHERE shipment_id = $1 AND decoupled_at IS NULL`,
      [shipmentId]
    );
    return parseInt(result.rows[0]?.count ?? "0", 10);
  }

  /** Check if intake is already coupled to this shipment (active). */
  async isCoupled(shipmentId: string, intakeId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM shipment_po_mapping
       WHERE shipment_id = $1 AND intake_id = $2 AND decoupled_at IS NULL`,
      [shipmentId, intakeId]
    );
    return result.rows.length > 0;
  }

  /** Couple one intake to shipment. Fails if already coupled (unique). */
  async couple(shipmentId: string, intakeId: string, coupledBy: string): Promise<ShipmentPoMappingRow> {
    const result = await this.pool.query<ShipmentPoMappingRow>(
      `INSERT INTO shipment_po_mapping (shipment_id, intake_id, coupled_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (shipment_id, intake_id) DO UPDATE SET
         decoupled_at = NULL, decoupled_by = NULL, decouple_reason = NULL, coupled_at = NOW(), coupled_by = $3
       RETURNING id, shipment_id, intake_id, coupled_at, coupled_by, decoupled_at, decoupled_by, decouple_reason, created_at`,
      [shipmentId, intakeId, coupledBy]
    );
    if (!result.rows[0]) throw new Error("ShipmentPoMappingRepository.couple: no row returned");
    return result.rows[0];
  }

  /** Decouple intake from shipment (audit: set decoupled_at, decoupled_by, reason). */
  async decouple(shipmentId: string, intakeId: string, decoupledBy: string, reason: string | null): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE shipment_po_mapping
       SET decoupled_at = NOW(), decoupled_by = $1, decouple_reason = $2
       WHERE shipment_id = $3 AND intake_id = $4 AND decoupled_at IS NULL`,
      [decoupledBy, reason, shipmentId, intakeId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
