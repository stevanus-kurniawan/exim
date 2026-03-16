/**
 * Note service: business logic only.
 */

import { NoteRepository } from "../repositories/note.repository.js";
import { ImportTransactionRepository } from "../../import-transactions/repositories/import-transaction.repository.js";
import { AppError } from "../../../middlewares/errorHandler.js";
import type { AddNoteResponseData, TransactionNoteListItem } from "../dto/index.js";

export class NoteService {
  constructor(
    private readonly noteRepo: NoteRepository,
    private readonly transactionRepo: ImportTransactionRepository
  ) {}

  async addNote(
    transactionId: string,
    note: string,
    createdBy: string
  ): Promise<AddNoteResponseData> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) throw new AppError("Transaction not found", 404);
    const row = await this.noteRepo.create(transactionId, note, createdBy);
    return { note_id: row.id };
  }

  async listByTransactionId(transactionId: string): Promise<TransactionNoteListItem[]> {
    const rows = await this.noteRepo.findByTransactionId(transactionId);
    return rows.map((r) => ({
      note_id: r.id,
      note: r.note,
      created_by: r.created_by,
      created_at: r.created_at.toISOString(),
    }));
  }
}
