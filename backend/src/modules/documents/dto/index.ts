/**
 * Document DTOs (API Spec §5.6).
 */

export const VERSION_LABELS = ["DRAFT", "FINAL"] as const;
export type VersionLabel = (typeof VERSION_LABELS)[number];

/** DB: transaction_documents */
export interface TransactionDocumentRow {
  id: string;
  transaction_id: string;
  document_type: string;
  document_name: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/** DB: document_versions */
export interface DocumentVersionRow {
  id: string;
  document_id: string;
  version_number: number;
  version_label: string;
  storage_key: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  uploaded_at: Date;
}

/** Upload document response (first version). */
export interface UploadDocumentResponseData {
  document_id: string;
  document_name: string;
  document_type: string;
  current_version: number;
  version_label: string;
  file_name: string;
}

/** List item for GET /import-transactions/:id/documents */
export interface TransactionDocumentListItem {
  document_id: string;
  document_name: string;
  document_type: string;
  latest_version_number: number;
  latest_version_label: string;
  uploaded_at: string;
}

/** GET /documents/:id response */
export interface DocumentDetailData {
  document_id: string;
  transaction_id: string;
  document_name: string;
  document_type: string;
  latest_version_number: number;
  latest_version_label: string;
}

/** Version list item (shared with document-versions). */
export interface DocumentVersionListItem {
  version_number: number;
  version_label: string;
  file_name: string;
  uploaded_by: string;
  uploaded_at: string;
}
