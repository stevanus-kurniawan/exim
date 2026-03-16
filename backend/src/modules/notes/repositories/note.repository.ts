/**
 * Note repository: persistence only.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type { TransactionNoteRow } from "../dto/index.js";

export class NoteRepository {
  private get pool(): Pool {
    return getPool();
  }

  async create(transactionId: string, note: string, createdBy: string): Promise<TransactionNoteRow> {
    const result = await this.pool.query<TransactionNoteRow>(
      `INSERT INTO transaction_notes (id, transaction_id, note, created_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())
       RETURNING id, transaction_id, note, created_by, created_at`,
      [transactionId, note, createdBy]
    );
    if (!result.rows[0]) throw new Error("NoteRepository.create: no row returned");
    return result.rows[0];
  }

  async findByTransactionId(transactionId: string): Promise<TransactionNoteRow[]> {
    const result = await this.pool.query<TransactionNoteRow>(
      `SELECT id, transaction_id, note, created_by, created_at
       FROM transaction_notes WHERE transaction_id = $1 ORDER BY created_at DESC`,
      [transactionId]
    );
    return result.rows;
  }
}
