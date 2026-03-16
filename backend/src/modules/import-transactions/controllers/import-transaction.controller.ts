/**
 * Import transaction controllers: parse request, return response only.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../../../shared/response.js";
import { validateCreateBody, validateUpdateBody, validateCloseBody } from "../validators/index.js";
import { ImportTransactionService } from "../services/import-transaction.service.js";
import { ImportTransactionRepository } from "../repositories/import-transaction.repository.js";
import type { ListImportTransactionsQuery } from "../dto/index.js";

const repo = new ImportTransactionRepository();
const service = new ImportTransactionService(repo);

function parseListQuery(req: Request): ListImportTransactionsQuery {
  const q = req.query as Record<string, unknown>;
  const page = q.page != null ? parseInt(String(q.page), 10) : undefined;
  const limit = q.limit != null ? parseInt(String(q.limit), 10) : undefined;
  return {
    page: Number.isNaN(page) ? undefined : page,
    limit: Number.isNaN(limit) ? undefined : limit,
    search: typeof q.search === "string" ? q.search : undefined,
    status: typeof q.status === "string" ? q.status : undefined,
    supplier_name: typeof q.supplier_name === "string" ? q.supplier_name : undefined,
    po_number: typeof q.po_number === "string" ? q.po_number : undefined,
    from_date: typeof q.from_date === "string" ? q.from_date : undefined,
    to_date: typeof q.to_date === "string" ? q.to_date : undefined,
  };
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  const validation = validateCreateBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  try {
    const data = await service.create(validation.data);
    sendSuccess(res, data, { message: "Import transaction created successfully", statusCode: 201 });
  } catch (e) {
    next(e);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = parseListQuery(req);
    const { items, total } = await service.list(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    sendSuccess(res, items, { meta: { page, limit, total } });
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  try {
    const data = await service.getById(id);
    if (!data) {
      sendError(res, "Transaction not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  const validation = validateUpdateBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  try {
    const data = await service.update(id, validation.data);
    if (!data) {
      sendError(res, "Transaction not found", { statusCode: 404 });
      return;
    }
    sendSuccess(res, { id: data.id }, { message: "Import transaction updated successfully" });
  } catch (e) {
    next(e);
  }
}

export async function close(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = req.params.id as string;
  const dto = validateCloseBody(req);
  try {
    await service.close(id, dto.reason ?? null);
    sendSuccess(res, {}, { message: "Import transaction closed successfully" });
  } catch (e) {
    next(e);
  }
}
