/**
 * Import transactions API — services layer. All import-transaction API calls go through here.
 */

import { apiGet, apiPost, apiRequest } from "./api-client";
import type {
  ImportTransactionListItem,
  ImportTransactionDetail,
  ListImportTransactionsQuery,
  CreateImportTransactionPayload,
  CreateImportTransactionResponseData,
  TimelineEntry,
  StatusSummaryData,
  TransactionDocumentListItem,
  UploadDocumentResponseData,
  TransactionNoteListItem,
} from "@/types/import-transactions";
import type { ApiResponse } from "@/types/api";

function buildQueryString(query: ListImportTransactionsQuery): string {
  const params = new URLSearchParams();
  if (query.page != null) params.set("page", String(query.page));
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.supplier_name) params.set("supplier_name", query.supplier_name);
  if (query.po_number) params.set("po_number", query.po_number);
  if (query.from_date) params.set("from_date", query.from_date);
  if (query.to_date) params.set("to_date", query.to_date);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function listImportTransactions(
  query: ListImportTransactionsQuery,
  accessToken: string | null
): Promise<ApiResponse<ImportTransactionListItem[]>> {
  const path = `import-transactions${buildQueryString(query)}`;
  return apiGet<ImportTransactionListItem[]>(path, accessToken);
}

export async function createImportTransaction(
  payload: CreateImportTransactionPayload,
  accessToken: string | null
): Promise<ApiResponse<CreateImportTransactionResponseData>> {
  return apiPost<CreateImportTransactionResponseData>("import-transactions", payload, accessToken);
}

export async function getTransactionDetail(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<ImportTransactionDetail>> {
  return apiGet<ImportTransactionDetail>(`import-transactions/${id}`, accessToken);
}

export async function getTimeline(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<TimelineEntry[]>> {
  return apiGet<TimelineEntry[]>(`import-transactions/${id}/timeline`, accessToken);
}

export async function getStatusSummary(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<StatusSummaryData>> {
  return apiGet<StatusSummaryData>(`import-transactions/${id}/status-summary`, accessToken);
}

export async function listDocuments(
  transactionId: string,
  accessToken: string | null
): Promise<ApiResponse<TransactionDocumentListItem[]>> {
  return apiGet<TransactionDocumentListItem[]>(
    `import-transactions/${transactionId}/documents`,
    accessToken
  );
}

export async function uploadDocument(
  transactionId: string,
  formData: FormData,
  accessToken: string | null
): Promise<ApiResponse<UploadDocumentResponseData>> {
  return apiRequest<UploadDocumentResponseData>(
    `import-transactions/${transactionId}/documents`,
    { method: "POST", body: formData, accessToken }
  );
}

export async function listNotes(
  transactionId: string,
  accessToken: string | null
): Promise<ApiResponse<TransactionNoteListItem[]>> {
  return apiGet<TransactionNoteListItem[]>(
    `import-transactions/${transactionId}/notes`,
    accessToken
  );
}

export async function addNote(
  transactionId: string,
  note: string,
  accessToken: string | null
): Promise<ApiResponse<{ note_id: string }>> {
  return apiPost<{ note_id: string }>(
    `import-transactions/${transactionId}/notes`,
    { note },
    accessToken
  );
}
