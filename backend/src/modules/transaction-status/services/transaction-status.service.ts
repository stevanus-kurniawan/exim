/**
 * Transaction status service: transition logic and timeline. No HTTP, no raw SQL.
 */

import { ImportTransactionRepository } from "../../import-transactions/repositories/import-transaction.repository.js";
import { StatusHistoryRepository } from "../repositories/status-history.repository.js";
import { AppError } from "../../../middlewares/errorHandler.js";
import {
  IMPORT_TRANSACTION_STATUSES,
  type TimelineEntry,
  type UpdateStatusResponseData,
  type StatusSummaryData,
} from "../dto/index.js";

const ORDERED_STATUSES = [...IMPORT_TRANSACTION_STATUSES];

function indexOfStatus(status: string): number {
  const i = ORDERED_STATUSES.indexOf(status as (typeof ORDERED_STATUSES)[number]);
  return i === -1 ? -1 : i;
}

/** Returns whether transition from current to newStatus is allowed (forward only). */
export function isAllowedTransition(currentStatus: string, newStatus: string): boolean {
  const cur = indexOfStatus(currentStatus);
  const next = indexOfStatus(newStatus);
  if (cur === -1 || next === -1) return false;
  return next === cur + 1;
}

export class TransactionStatusService {
  constructor(
    private readonly transactionRepo: ImportTransactionRepository,
    private readonly historyRepo: StatusHistoryRepository
  ) {}

  async updateStatus(
    transactionId: string,
    newStatus: string,
    remarks: string | null,
    changedBy: string
  ): Promise<UpdateStatusResponseData> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }
    if (transaction.closed_at) {
      throw new AppError("Cannot update status of a closed transaction", 409);
    }

    const currentStatus = transaction.current_status;
    if (!isAllowedTransition(currentStatus, newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Only forward transitions are allowed.`,
        409
      );
    }

    await this.historyRepo.create({
      transactionId,
      previousStatus: currentStatus,
      newStatus,
      remarks,
      changedBy,
    });

    const updated = await this.transactionRepo.updateCurrentStatus(transactionId, newStatus);
    if (!updated) {
      throw new AppError("Failed to update transaction status", 500);
    }

    return {
      transaction_id: transactionId,
      previous_status: currentStatus,
      current_status: newStatus,
      updated_at: updated.updated_at.toISOString(),
    };
  }

  async getTimeline(transactionId: string): Promise<TimelineEntry[]> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) return [];

    const rows = await this.historyRepo.findByTransactionId(transactionId);
    if (rows.length === 0) {
      return [
        {
          sequence: 1,
          status: transaction.current_status,
          changed_at: transaction.created_at.toISOString(),
          changed_by: "System",
          remarks: null,
        },
      ];
    }
    return rows.map((row, i) => ({
      sequence: i + 1,
      status: row.new_status,
      changed_at: row.changed_at.toISOString(),
      changed_by: row.changed_by,
      remarks: row.remarks,
    }));
  }

  async getStatusSummary(transactionId: string): Promise<StatusSummaryData | null> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) return null;

    const rows = await this.historyRepo.findByTransactionId(transactionId);
    const current = transaction.current_status;
    const lastEntry = rows[rows.length - 1];
    const previous = lastEntry ? lastEntry.previous_status : null;
    const lastUpdatedAt = lastEntry ? lastEntry.changed_at : transaction.updated_at;

    return {
      current_status: current,
      previous_status: previous,
      last_updated_at: lastUpdatedAt.toISOString(),
    };
  }
}
