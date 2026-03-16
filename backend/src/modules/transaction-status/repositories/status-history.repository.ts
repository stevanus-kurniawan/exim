/**
 * Status history repository: persistence only. No business logic.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type { StatusHistoryRow } from "../dto/index.js";

export interface CreateHistoryInput {
  transactionId: string;
  previousStatus: string | null;
  newStatus: string;
  remarks: string | null;
  changedBy: string;
}

export class StatusHistoryRepository {
  private get pool(): Pool {
    return getPool();
  }

  async create(input: CreateHistoryInput): Promise<StatusHistoryRow> {
    const result = await this.pool.query<StatusHistoryRow>(
      `INSERT INTO import_transaction_status_history
       (id, transaction_id, previous_status, new_status, remarks, changed_by, changed_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
       RETURNING id, transaction_id, previous_status, new_status, remarks, changed_by, changed_at`,
      [
        input.transactionId,
        input.previousStatus,
        input.newStatus,
        input.remarks,
        input.changedBy,
      ]
    );
    if (!result.rows[0]) throw new Error("StatusHistoryRepository.create: no row returned");
    return result.rows[0];
  }

  async findByTransactionId(transactionId: string): Promise<StatusHistoryRow[]> {
    const result = await this.pool.query<StatusHistoryRow>(
      `SELECT id, transaction_id, previous_status, new_status, remarks, changed_by, changed_at
       FROM import_transaction_status_history
       WHERE transaction_id = $1
       ORDER BY changed_at ASC`,
      [transactionId]
    );
    return result.rows;
  }
}
