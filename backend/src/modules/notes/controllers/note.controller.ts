/**
 * Note controllers: parse request, return response only.
 */

import type { Request, Response, NextFunction } from "express";
import { sendSuccess, sendError } from "../../../shared/response.js";
import { validateAddNoteBody } from "../validators/index.js";
import { NoteService } from "../services/note.service.js";
import { NoteRepository } from "../repositories/note.repository.js";
import { ImportTransactionRepository } from "../../import-transactions/repositories/import-transaction.repository.js";

const noteRepo = new NoteRepository();
const transactionRepo = new ImportTransactionRepository();
const service = new NoteService(noteRepo, transactionRepo);

export async function addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transactionId = req.params.id as string;
  const validation = validateAddNoteBody(req);
  if (!validation.ok) {
    sendError(res, "Validation error", { errors: validation.errors, statusCode: 400 });
    return;
  }
  const createdBy = req.user?.name ?? "System";
  try {
    const data = await service.addNote(transactionId, validation.data.note, createdBy);
    sendSuccess(res, data, { message: "Note added successfully", statusCode: 201 });
  } catch (e) {
    next(e);
  }
}

export async function listNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transactionId = req.params.id as string;
  try {
    const data = await service.listByTransactionId(transactionId);
    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
}
