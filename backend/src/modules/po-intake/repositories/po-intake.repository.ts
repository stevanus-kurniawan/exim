/**
 * PO intake repository: database access only. No business logic.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type {
  CreatePoIntakeDto,
  ListPoIntakeQuery,
  PoImportHistoryRow,
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
      `SELECT 1 AS n FROM Import_purchase_order WHERE external_id = $1 LIMIT 1`,
      [externalId]
    );
    return result.rows.length > 0;
  }

  /** True if another row already uses this PO number (case-insensitive, trimmed). */
  async existsByPoNumberTrimmed(poNumber: string): Promise<boolean> {
    const result = await this.pool.query<{ n: number }>(
      `SELECT 1 AS n FROM Import_purchase_order
       WHERE LOWER(TRIM(po_number)) = LOWER(TRIM($1)) LIMIT 1`,
      [poNumber]
    );
    return result.rows.length > 0;
  }

  /** Resolve intake id by PO number (trimmed, case-insensitive). */
  async findIdByPoNumberTrimmed(poNumber: string): Promise<string | null> {
    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM Import_purchase_order
       WHERE LOWER(TRIM(po_number)) = LOWER(TRIM($1)) LIMIT 1`,
      [poNumber]
    );
    return result.rows[0]?.id ?? null;
  }

  async create(dto: CreatePoIntakeDto, intakeStatus: string): Promise<PoIntakeRow> {
    const result = await this.pool.query<PoIntakeRow>(
      `INSERT INTO Import_purchase_order
       (external_id, po_number, plant, pt, supplier_name, delivery_location, incoterm_location, kawasan_berikat, currency, intake_status, total_amount_po, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, NOW(), NOW())
       RETURNING id, external_id, po_number, plant, pt, supplier_name, delivery_location, incoterm_location, kawasan_berikat, currency,
         intake_status, taken_by_user_id, taken_at, created_at, updated_at`,
      [
        dto.external_id,
        dto.po_number,
        dto.plant ?? null,
        dto.pt ?? null,
        dto.supplier_name,
        dto.delivery_location ?? null,
        dto.incoterm_location ?? null,
        dto.kawasan_berikat ?? null,
        dto.currency ?? null,
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
      const qty = it?.qty ?? null;
      const unitPrice = it?.value ?? null;
      const totalAmountItem = qty != null && unitPrice != null ? qty * unitPrice : null;
      await this.pool.query(
        `INSERT INTO Import_purchase_order_items (intake_id, line_number, item_description, qty, unit, unit_price, total_amount_item)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          intakeId,
          it?.line_number ?? i + 1,
          it?.item_description ?? null,
          qty,
          it?.unit ?? null,
          unitPrice,
          totalAmountItem,
        ]
      );
    }
    await this.recomputeTotalAmountPo(intakeId);
  }

  async findById(id: string): Promise<PoIntakeRow | null> {
    const result = await this.pool.query<PoIntakeRow>(
      `SELECT id, external_id, po_number, plant, pt, supplier_name, delivery_location, incoterm_location, kawasan_berikat, currency,
        intake_status, taken_by_user_id, taken_at, created_at, updated_at
       FROM Import_purchase_order WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findItemsByIntakeId(intakeId: string): Promise<PoIntakeItemRow[]> {
    const result = await this.pool.query<PoIntakeItemRow>(
      `SELECT id, intake_id, line_number, item_description, qty, unit, unit_price AS value, created_at
       FROM Import_purchase_order_items WHERE intake_id = $1 ORDER BY line_number ASC`,
      [intakeId]
    );
    return result.rows;
  }

  /** Sum of line amounts: unit_price × qty. Used for BM/PPN/PPH/PDRI. */
  async getTotalItemsAmountForIntakeIds(intakeIds: string[]): Promise<number> {
    if (intakeIds.length === 0) return 0;
    const result = await this.pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(
         COALESCE(i.unit_price, 0) * COALESCE(i.qty, 0)
       ), 0)::text AS total
       FROM Import_purchase_order_items i WHERE i.intake_id = ANY($1::uuid[])`,
      [intakeIds]
    );
    const total = result.rows[0]?.total;
    return total != null ? parseFloat(total) : 0;
  }

  async recomputeTotalAmountPo(intakeId: string): Promise<void> {
    await this.pool.query(
      `UPDATE Import_purchase_order p
       SET total_amount_po = COALESCE((
         SELECT SUM(COALESCE(i.total_amount_item, 0))
         FROM Import_purchase_order_items i
         WHERE i.intake_id = p.id
       ), 0),
       updated_at = NOW()
       WHERE p.id = $1`,
      [intakeId]
    );
  }

  async recomputeTotalAmountItemByLine(intakeId: string, itemId: string): Promise<void> {
    await this.pool.query(
      `UPDATE Import_purchase_order_items
       SET total_amount_item = COALESCE(unit_price, 0) * COALESCE(qty, 0)
       WHERE id = $1 AND intake_id = $2`,
      [itemId, intakeId]
    );
    await this.recomputeTotalAmountPo(intakeId);
  }

  async findAll(query: ListPoIntakeQuery): Promise<{
    rows: (PoIntakeRow & { taken_by_name: string | null })[];
    total: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const offset = (page - 1) * limit;
    const conditions: string[] = ["TRUE"];
    const params: unknown[] = [];
    let idx = 1;

    if (query.intake_status) {
      conditions.push(`i.intake_status = $${idx++}`);
      params.push(query.intake_status);
    }
    if (query.po_number) {
      conditions.push(`i.po_number ILIKE $${idx++}`);
      params.push(`%${query.po_number}%`);
    }
    if (query.search) {
      conditions.push(
        `(i.po_number ILIKE $${idx} OR i.supplier_name ILIKE $${idx} OR i.external_id ILIKE $${idx})`
      );
      params.push(`%${query.search}%`);
      idx++;
    }

    const where = conditions.join(" AND ");
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM Import_purchase_order i WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(limit, offset);
    const result = await this.pool.query<PoIntakeRow & { taken_by_name: string | null }>(
      `SELECT i.id, i.external_id, i.po_number, i.plant, i.pt, i.supplier_name, i.delivery_location, i.incoterm_location, i.kawasan_berikat, i.currency,
        i.intake_status, i.taken_by_user_id, i.taken_at, i.created_at, i.updated_at,
        u.name AS taken_by_name
       FROM Import_purchase_order i
       LEFT JOIN users u ON u.id::text = i.taken_by_user_id
       WHERE ${where}
       ORDER BY i.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return { rows: result.rows, total };
  }

  async updateIntakeStatus(id: string, intakeStatus: string): Promise<PoIntakeRow | null> {
    const result = await this.pool.query<PoIntakeRow>(
      `UPDATE Import_purchase_order SET intake_status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, external_id, po_number, plant, pt, supplier_name, delivery_location, incoterm_location, kawasan_berikat, currency,
         intake_status, taken_by_user_id, taken_at, created_at, updated_at`,
      [id, intakeStatus]
    );
    return result.rows[0] ?? null;
  }

  async takeOwnership(id: string, userId: string): Promise<PoIntakeRow | null> {
    const result = await this.pool.query<PoIntakeRow>(
      `UPDATE Import_purchase_order SET intake_status = 'CLAIMED', taken_by_user_id = $1, taken_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING id, external_id, po_number, plant, pt, supplier_name, delivery_location, incoterm_location, kawasan_berikat, currency,
         intake_status, taken_by_user_id, taken_at, created_at, updated_at`,
      [userId, id]
    );
    return result.rows[0] ?? null;
  }

  async createImportHistory(input: {
    fileName: string | null;
    uploadedBy: string;
    totalRows: number;
    importedPos: number;
    importedRows: number;
    failedRows: number;
    status: "SUCCESS" | "PARTIAL" | "FAILED";
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO po_intake_import_history
       (file_name, uploaded_by, total_rows, imported_pos, imported_rows, failed_rows, status, created_at, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        input.fileName,
        input.uploadedBy,
        input.totalRows,
        input.importedPos,
        input.importedRows,
        input.failedRows,
        input.status,
      ]
    );
  }

  async listImportHistory(limit = 20): Promise<PoImportHistoryRow[]> {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const result = await this.pool.query<PoImportHistoryRow>(
      `SELECT id, file_name, uploaded_by, total_rows, imported_pos, imported_rows, failed_rows, status, created_at, finished_at
       FROM po_intake_import_history
       ORDER BY created_at DESC
       LIMIT $1`,
      [safeLimit]
    );
    return result.rows;
  }
}
