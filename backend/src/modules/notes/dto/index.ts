/**
 * Notes DTOs (API Spec §5.8).
 */

/** Add note request body. */
export interface AddNoteDto {
  note: string;
}

/** DB row: transaction_notes */
export interface TransactionNoteRow {
  id: string;
  transaction_id: string;
  note: string;
  created_by: string;
  created_at: Date;
}

/** Add note response data. */
export interface AddNoteResponseData {
  note_id: string;
}

/** List item for GET /import-transactions/:id/notes */
export interface TransactionNoteListItem {
  note_id: string;
  note: string;
  created_by: string;
  created_at: string;
}
