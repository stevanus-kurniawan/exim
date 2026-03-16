/**
 * Close import transaction validation (reason optional).
 */

import type { Request } from "express";
import type { CloseImportTransactionDto } from "../dto/index.js";

export function validateCloseBody(req: Request): CloseImportTransactionDto {
  const body = req.body as Record<string, unknown>;
  return {
    reason: typeof body?.reason === "string" ? body.reason.trim() : undefined,
  };
}
