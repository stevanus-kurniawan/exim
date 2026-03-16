/**
 * Import transaction repository: database access only. No business logic.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type {
  ImportTransactionRow,
  CreateImportTransactionDto,
  UpdateImportTransactionDto,
  ListImportTransactionsQuery,
} from "../dto/index.js";

export class ImportTransactionRepository {
  private get pool(): Pool {
    return getPool();
  }

  async getNextTransactionNo(year: number): Promise<string> {
    const prefix = `IMP-${year}-`;
    const result = await this.pool.query<{ transaction_no: string }>(
      `SELECT transaction_no FROM import_transactions WHERE transaction_no LIKE $1 ORDER BY transaction_no DESC LIMIT 1`,
      [prefix + "%"]
    );
    const last = result.rows[0]?.transaction_no;
    const nextNum = last ? parseInt(last.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  async create(dto: CreateImportTransactionDto, transactionNo: string): Promise<ImportTransactionRow> {
    const eta = dto.eta ? new Date(dto.eta) : null;
    const result = await this.pool.query<ImportTransactionRow>(
      `INSERT INTO import_transactions (
        transaction_no, vendor_name, supplier_country, incoterm, currency, estimated_value,
        origin_port_code, origin_port_name, destination_port_code, destination_port_name,
        eta, remarks, po_number, purchase_request_number, item_name, item_category,
        current_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'INITIATE_SHIPPING_DOCUMENT', NOW(), NOW())
      RETURNING id, transaction_no, vendor_code, vendor_name, supplier_country, forwarder_code, forwarder_name,
        warehouse_code, warehouse_name, incoterm, shipment_method, origin_port_code, origin_port_name, origin_port_country,
        destination_port_code, destination_port_name, destination_port_country, etd, eta, current_status,
        closed_at, close_reason, remarks, po_number, purchase_request_number, item_name, item_category,
        currency, estimated_value, created_at, updated_at`,
      [
        transactionNo,
        dto.supplier_name,
        dto.supplier_country ?? null,
        dto.incoterm ?? null,
        dto.currency ?? null,
        dto.estimated_value ?? null,
        dto.origin_port_code,
        dto.origin_port_name ?? null,
        dto.destination_port_code,
        dto.destination_port_name ?? null,
        eta,
        dto.remarks ?? null,
        dto.po_number,
        dto.purchase_request_number ?? null,
        dto.item_name ?? null,
        dto.item_category ?? null,
      ]
    );
    if (!result.rows[0]) throw new Error("ImportTransactionRepository.create: no row returned");
    return result.rows[0];
  }

  async findById(id: string): Promise<ImportTransactionRow | null> {
    const result = await this.pool.query<ImportTransactionRow>(
      `SELECT id, transaction_no, vendor_code, vendor_name, supplier_country, forwarder_code, forwarder_name,
        warehouse_code, warehouse_name, incoterm, shipment_method, origin_port_code, origin_port_name, origin_port_country,
        destination_port_code, destination_port_name, destination_port_country, etd, eta, current_status,
        closed_at, close_reason, remarks, po_number, purchase_request_number, item_name, item_category,
        currency, estimated_value, created_at, updated_at
       FROM import_transactions WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(query: ListImportTransactionsQuery): Promise<{ rows: ImportTransactionRow[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const offset = (page - 1) * limit;
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];
    let idx = 1;

    if (query.status) {
      conditions.push(`current_status = $${idx++}`);
      params.push(query.status);
    }
    if (query.supplier_name) {
      conditions.push(`vendor_name ILIKE $${idx++}`);
      params.push(`%${query.supplier_name}%`);
    }
    if (query.po_number) {
      conditions.push(`po_number ILIKE $${idx++}`);
      params.push(`%${query.po_number}%`);
    }
    if (query.from_date) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(query.from_date);
    }
    if (query.to_date) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(query.to_date);
    }
    if (query.search) {
      conditions.push(
        `(transaction_no ILIKE $${idx} OR po_number ILIKE $${idx} OR vendor_name ILIKE $${idx})`
      );
      params.push(`%${query.search}%`);
      idx++;
    }

    const where = conditions.join(" AND ");
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM import_transactions WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(limit, offset);
    const result = await this.pool.query<ImportTransactionRow>(
      `SELECT id, transaction_no, vendor_code, vendor_name, supplier_country, forwarder_code, forwarder_name,
        warehouse_code, warehouse_name, incoterm, shipment_method, origin_port_code, origin_port_name, origin_port_country,
        destination_port_code, destination_port_name, destination_port_country, etd, eta, current_status,
        closed_at, close_reason, remarks, po_number, purchase_request_number, item_name, item_category,
        currency, estimated_value, created_at, updated_at
       FROM import_transactions WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return { rows: result.rows, total };
  }

  async update(id: string, dto: UpdateImportTransactionDto): Promise<ImportTransactionRow | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [];
    let idx = 1;
    if (dto.eta !== undefined) {
      updates.push(`eta = $${idx++}`);
      params.push(dto.eta ? new Date(dto.eta) : null);
    }
    if (dto.remarks !== undefined) {
      updates.push(`remarks = $${idx++}`);
      params.push(dto.remarks);
    }
    if (params.length === 0) return this.findById(id);
    params.push(id);
    const result = await this.pool.query<ImportTransactionRow>(
      `UPDATE import_transactions SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, transaction_no, vendor_code, vendor_name, supplier_country, forwarder_code, forwarder_name, warehouse_code, warehouse_name, incoterm, shipment_method, origin_port_code, origin_port_name, origin_port_country, destination_port_code, destination_port_name, destination_port_country, etd, eta, current_status, closed_at, close_reason, remarks, po_number, purchase_request_number, item_name, item_category, currency, estimated_value, created_at, updated_at`,
      params
    );
    return result.rows[0] ?? null;
  }

  async close(id: string, reason: string | null): Promise<ImportTransactionRow | null> {
    const result = await this.pool.query<ImportTransactionRow>(
      `UPDATE import_transactions SET closed_at = NOW(), close_reason = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, transaction_no, vendor_code, vendor_name, supplier_country, forwarder_code, forwarder_name, warehouse_code, warehouse_name, incoterm, shipment_method, origin_port_code, origin_port_name, origin_port_country, destination_port_code, destination_port_name, destination_port_country, etd, eta, current_status, closed_at, close_reason, remarks, po_number, purchase_request_number, item_name, item_category, currency, estimated_value, created_at, updated_at`,
      [reason, id]
    );
    return result.rows[0] ?? null;
  }

  async updateCurrentStatus(id: string, currentStatus: string): Promise<ImportTransactionRow | null> {
    const result = await this.pool.query<ImportTransactionRow>(
      `UPDATE import_transactions SET current_status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, transaction_no, vendor_code, vendor_name, supplier_country, forwarder_code, forwarder_name, warehouse_code, warehouse_name, incoterm, shipment_method, origin_port_code, origin_port_name, origin_port_country, destination_port_code, destination_port_name, destination_port_country, etd, eta, current_status, closed_at, close_reason, remarks, po_number, purchase_request_number, item_name, item_category, currency, estimated_value, created_at, updated_at`,
      [currentStatus, id]
    );
    return result.rows[0] ?? null;
  }
}
