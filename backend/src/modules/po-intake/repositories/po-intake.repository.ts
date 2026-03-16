/**
 * PO intake repository: database access only. No business logic.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type {
  CreatePoIntakeDto,
  ListPoIntakeQuery,
  PoIntakeRow,
  PoIntakeItemRow,
} from "../dto/index.js";

export class PoIntakeRepository {
  private get pool(): Pool {
    return getPool();
  }

  /** Returns true if external_id already exists (duplicate prevention). */
  async existsByExternalId(externalId: string): Promise<boolean> {
    const result = await this.pool.query<{ n: number }>(
      `SELECT 1 AS n FROM imported_po_intake WHERE external_id = $1 LIMIT 1`,
      [externalId]
    );
    return result.rows.length > 0;
  }

  async create(dto: CreatePoIntakeDto, intakeStatus: string): Promise<PoIntakeRow> {
    const result = await this.pool.query<PoIntakeRow>(
      `INSERT INTO imported_po_intake
       (external_id, po_number, plant, supplier_name, delivery_location, incoterm_location, kawasan_berikat, intake_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, external_id, po_number, plant, supplier_name, delivery_location, incoterm_location, kawasan_berikat,
         intake_status, taken_by_user_id, taken_at, created_at, updated_at`,
      [
        dto.external_id,
        dto.po_number,
        dto.plant ?? null,
        dto.supplier_name,
        dto.delivery_location ?? null,
        dto.incoterm_location ?? null,
        dto.kawasan_berikat ?? null,
        intakeStatus,
      ]
    );
    if (!result.rows[0]) throw new Error("PoIntakeRepository.create: no row returned");
    return result.rows[0];
  }

  async insertItems(intakeId: string, items: CreatePoIntakeDto["items"]): Promise<void> {
    if (!items?.length) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await this.pool.query(
        `INSERT INTO imported_po_intake_items (intake_id, line_number, item_description, qty, unit, value, kurs)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          intakeId,
          i + 1,
          it?.item_description ?? null,
          it?.qty ?? null,
          it?.unit ?? null,
          it?.value ?? null,
          it?.kurs ?? null,
        ]
      );
    }
  }

  async findById(id: string): Promise<PoIntakeRow | null> {
    const result = await this.pool.query<PoIntakeRow>(
      `SELECT id, external_id, po_number, plant, supplier_name, delivery_location, incoterm_location, kawasan_berikat,
        intake_status, taken_by_user_id, taken_at, created_at, updated_at
       FROM imported_po_intake WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findItemsByIntakeId(intakeId: string): Promise<PoIntakeItemRow[]> {
    const result = await this.pool.query<PoIntakeItemRow>(
      `SELECT id, intake_id, line_number, item_description, qty, unit, value, kurs, created_at
       FROM imported_po_intake_items WHERE intake_id = $1 ORDER BY line_number ASC`,
      [intakeId]
    );
    return result.rows;
  }

  /** Sum of line amounts (COALESCE(value, qty * kurs)) for all items of the given intake IDs. Used for PPN/PPH/PDRI. */
  async getTotalItemsAmountForIntakeIds(intakeIds: string[]): Promise<number> {
    if (intakeIds.length === 0) return 0;
    const result = await this.pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(COALESCE(i.value, i.qty * i.kurs, 0)), 0)::text AS total
       FROM imported_po_intake_items i WHERE i.intake_id = ANY($1::uuid[])`,
      [intakeIds]
    );
    const total = result.rows[0]?.total;
    return total != null ? parseFloat(total) : 0;
  }

  async findAll(query: ListPoIntakeQuery): Promise<{ rows: PoIntakeRow[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const offset = (page - 1) * limit;
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];
    let idx = 1;

    if (query.intake_status) {
      conditions.push(`intake_status = $${idx++}`);
      params.push(query.intake_status);
    }
    if (query.po_number) {
      conditions.push(`po_number ILIKE $${idx++}`);
      params.push(`%${query.po_number}%`);
    }
    if (query.search) {
      conditions.push(
        `(po_number ILIKE $${idx} OR supplier_name ILIKE $${idx} OR external_id ILIKE $${idx})`
      );
      params.push(`%${query.search}%`);
      idx++;
    }

    const where = conditions.join(" AND ");
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM imported_po_intake WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(limit, offset);
    const result = await this.pool.query<PoIntakeRow>(
      `SELECT id, external_id, po_number, plant, supplier_name, delivery_location, incoterm_location, kawasan_berikat,
        intake_status, taken_by_user_id, taken_at, created_at, updated_at
       FROM imported_po_intake WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return { rows: result.rows, total };
  }

  async updateStatusToNotified(id: string): Promise<PoIntakeRow | null> {
    const result = await this.pool.query<PoIntakeRow>(
      `UPDATE imported_po_intake SET intake_status = 'NOTIFIED', updated_at = NOW()
       WHERE id = $1 AND intake_status = 'NEW_PO_DETECTED'
       RETURNING id, external_id, po_number, plant, supplier_name, delivery_location, incoterm_location, kawasan_berikat,
         intake_status, taken_by_user_id, taken_at, created_at, updated_at`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async takeOwnership(id: string, userId: string): Promise<PoIntakeRow | null> {
    const result = await this.pool.query<PoIntakeRow>(
      `UPDATE imported_po_intake SET intake_status = 'TAKEN_BY_EXIM', taken_by_user_id = $1, taken_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING id, external_id, po_number, plant, supplier_name, delivery_location, incoterm_location, kawasan_berikat,
         intake_status, taken_by_user_id, taken_at, created_at, updated_at`,
      [userId, id]
    );
    return result.rows[0] ?? null;
  }

  async setGroupedToShipment(id: string): Promise<PoIntakeRow | null> {
    const result = await this.pool.query<PoIntakeRow>(
      `UPDATE imported_po_intake SET intake_status = 'GROUPED_TO_SHIPMENT', updated_at = NOW()
       WHERE id = $1
       RETURNING id, external_id, po_number, plant, supplier_name, delivery_location, incoterm_location, kawasan_berikat,
         intake_status, taken_by_user_id, taken_at, created_at, updated_at`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  /** Revert intake status to TAKEN_BY_EXIM after decouple from shipment. */
  async setBackToTaken(id: string): Promise<PoIntakeRow | null> {
    const result = await this.pool.query<PoIntakeRow>(
      `UPDATE imported_po_intake SET intake_status = 'TAKEN_BY_EXIM', updated_at = NOW()
       WHERE id = $1 AND intake_status = 'GROUPED_TO_SHIPMENT'
       RETURNING id, external_id, po_number, plant, supplier_name, delivery_location, incoterm_location, kawasan_berikat,
         intake_status, taken_by_user_id, taken_at, created_at, updated_at`,
      [id]
    );
    return result.rows[0] ?? null;
  }
}
