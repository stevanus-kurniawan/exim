/**
 * Transaction status controllers: parse request, return response only.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../../../shared/response.js";
import { validateUpdateStatusBody } from "../validators/index.js";
import { TransactionStatusService } from "../services/transaction-status.service.js";
import { ImportTransactionRepository } from "../../import-transactions/repositories/import-transaction.repository.js";
import { StatusHistoryRepository } from "../repositories/status-history.repository.js";

const transactionRepo = new ImportTransactionRepository();
const historyRepo = new StatusHistoryRepository();
const service = new TransactionStatusService(transactionRepo, historyRepo);

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  const validation = validateUpdateStatusBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  const changedBy = req.user?.name ?? "System";
  try {
    const data = await service.updateStatus(
      id,
      validation.data.new_status,
      validation.data.remarks ?? null,
      changedBy
    );
    sendSuccess(res, data, { message: "Transaction status updated successfully" });
  } catch (e) {
    next(e);
  }
}

export async function getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  try {
    const data = await service.getTimeline(id);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function getStatusSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  try {
    const data = await service.getStatusSummary(id);
    if (!data) {
      sendError(res, "Transaction not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}
