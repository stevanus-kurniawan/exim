/**
 * Import transaction service: business logic only. No HTTP, no raw SQL.
 */

import { ImportTransactionRepository } from "../repositories/import-transaction.repository.js";
import { AppError } from "../../../middlewares/errorHandler.js";
import type {
  CreateImportTransactionDto,
  UpdateImportTransactionDto,
  ListImportTransactionsQuery,
  ImportTransactionRow,
  CreateImportTransactionResponse,
  ImportTransactionListItem,
  ImportTransactionDetail,
} from "../dto/index.js";

function toListItem(row: ImportTransactionRow): ImportTransactionListItem {
  return {
    id: row.id,
    transaction_number: row.transaction_no,
    po_number: row.po_number,
    supplier_name: row.vendor_name,
    origin_port_name: row.origin_port_name,
    destination_port_name: row.destination_port_name,
    current_status: row.current_status,
    eta: row.eta ? row.eta.toISOString().slice(0, 10) : null,
  };
}

function toDetail(row: ImportTransactionRow): ImportTransactionDetail {
  return {
    id: row.id,
    transaction_number: row.transaction_no,
    po_number: row.po_number,
    purchase_request_number: row.purchase_request_number,
    item_name: row.item_name,
    item_category: row.item_category,
    supplier_name: row.vendor_name,
    supplier_country: row.supplier_country,
    incoterm: row.incoterm,
    currency: row.currency,
    estimated_value: row.estimated_value ?? null,
    origin_port_code: row.origin_port_code,
    origin_port_name: row.origin_port_name,
    destination_port_code: row.destination_port_code,
    destination_port_name: row.destination_port_name,
    eta: row.eta ? row.eta.toISOString().slice(0, 10) : null,
    current_status: row.current_status,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function toCreateResponse(row: ImportTransactionRow): CreateImportTransactionResponse {
  return {
    id: row.id,
    transaction_number: row.transaction_no,
    po_number: row.po_number,
    current_status: row.current_status,
    created_at: row.created_at.toISOString(),
  };
}

export class ImportTransactionService {
  constructor(private readonly repo: ImportTransactionRepository) {}

  async create(dto: CreateImportTransactionDto): Promise<CreateImportTransactionResponse> {
    const year = new Date().getFullYear();
    const transactionNo = await this.repo.getNextTransactionNo(year);
    const row = await this.repo.create(dto, transactionNo);
    return toCreateResponse(row);
  }

  async list(query: ListImportTransactionsQuery): Promise<{ items: ImportTransactionListItem[]; total: number }> {
    const { rows, total } = await this.repo.findAll(query);
    return { items: rows.map(toListItem), total };
  }

  async getById(id: string): Promise<ImportTransactionDetail | null> {
    const row = await this.repo.findById(id);
    return row ? toDetail(row) : null;
  }

  async update(id: string, dto: UpdateImportTransactionDto): Promise<ImportTransactionDetail | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    if (existing.closed_at) {
      throw new AppError("Cannot update a closed transaction", 409);
    }
    const row = await this.repo.update(id, dto);
    return row ? toDetail(row) : null;
  }

  async close(id: string, reason: string | null): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError("Transaction not found", 404);
    }
    if (existing.closed_at) {
      throw new AppError("Transaction is already closed", 409);
    }
    await this.repo.close(id, reason);
  }
}
