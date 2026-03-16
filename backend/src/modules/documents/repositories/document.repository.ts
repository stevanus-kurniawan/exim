/**
 * Document repository: persistence only. No business logic.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type { TransactionDocumentRow } from "../dto/index.js";

export interface CreateDocumentInput {
  transactionId: string;
  documentType: string;
  documentName: string;
}

export class DocumentRepository {
  private get pool(): Pool {
    return getPool();
  }

  async create(input: CreateDocumentInput): Promise<TransactionDocumentRow> {
    const result = await this.pool.query<TransactionDocumentRow>(
      `INSERT INTO transaction_documents (id, transaction_id, document_type, document_name, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       RETURNING id, transaction_id, document_type, document_name, created_at, updated_at, deleted_at`,
      [input.transactionId, input.documentType, input.documentName]
    );
    if (!result.rows[0]) throw new Error("DocumentRepository.create: no row returned");
    return result.rows[0];
  }

  async findById(id: string): Promise<TransactionDocumentRow | null> {
    const result = await this.pool.query<TransactionDocumentRow>(
      `SELECT id, transaction_id, document_type, document_name, created_at, updated_at, deleted_at
       FROM transaction_documents WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByTransactionId(transactionId: string): Promise<TransactionDocumentRow[]> {
    const result = await this.pool.query<TransactionDocumentRow>(
      `SELECT id, transaction_id, document_type, document_name, created_at, updated_at, deleted_at
       FROM transaction_documents WHERE transaction_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`,
      [transactionId]
    );
    return result.rows;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE transaction_documents SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
