/**
 * PO API — services layer. All PO (imported PO intake) API calls go through here.
 */

import { apiGet, apiPost, apiPatch, apiRequest } from "./api-client";
import type {
  PoListItem,
  PoDetail,
  ListPoQuery,
  CreateTestPoPayload,
  UpdatePoPayload,
  PoImportCsvResult,
  PoImportHistoryItem,
  PoIntakeActivityItem,
} from "@/types/po";
import type { ApiResponse } from "@/types/api";
import { config } from "@/lib/config";

function buildQueryString(query: ListPoQuery): string {
  const params = new URLSearchParams();
  if (query.page != null) params.set("page", String(query.page));
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.intake_status) params.set("intake_status", query.intake_status);
  if (query.po_number) params.set("po_number", query.po_number);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function listPo(
  query: ListPoQuery,
  accessToken: string | null
): Promise<ApiResponse<PoListItem[]>> {
  const path = `po${buildQueryString(query)}`;
  return apiGet<PoListItem[]>(path, accessToken);
}

export async function getPoDetail(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<PoDetail>> {
  return apiGet<PoDetail>(`po/${id}`, accessToken);
}

export async function getPoActivityLog(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<{ items: PoIntakeActivityItem[] }>> {
  return apiGet<{ items: PoIntakeActivityItem[] }>(`po/${id}/activity-log`, accessToken);
}

export async function updatePo(
  id: string,
  body: UpdatePoPayload,
  accessToken: string | null
): Promise<ApiResponse<PoDetail>> {
  return apiPatch<PoDetail>(`po/${id}`, body, accessToken);
}

export async function takeOwnership(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<PoDetail>> {
  return apiPost<PoDetail>(`po/${id}/take`, {}, accessToken);
}

export async function createShipmentFromPo(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<{ shipment_id: string; shipment_number: string; shipment?: unknown }>> {
  return apiPost(`po/${id}/create-shipment`, {}, accessToken);
}

export async function couplePoToShipment(
  id: string,
  shipmentId: string,
  accessToken: string | null
): Promise<ApiResponse<unknown>> {
  return apiPost(`po/${id}/couple-to-shipment`, { shipment_id: shipmentId }, accessToken);
}

/** Temporary: create a test PO for E2E testing (integration not yet available). POST /po/test-create */
export async function createTestPo(
  payload: CreateTestPoPayload,
  accessToken: string | null
): Promise<ApiResponse<{ id: string; external_id: string; po_number: string; intake_status: string; created_at: string }>> {
  return apiPost("po/test-create", payload, accessToken);
}

/** GET /po/lookup-by-po-number — resolve intake id from PO number (for grouping on a shipment). */
export async function lookupPoByPoNumber(
  poNumber: string,
  accessToken: string | null
): Promise<ApiResponse<{ id: string }>> {
  const q = new URLSearchParams({ po_number: poNumber.trim() });
  return apiGet<{ id: string }>(`po/lookup-by-po-number?${q.toString()}`, accessToken);
}

export async function importPoCsv(
  file: File,
  accessToken: string | null
): Promise<ApiResponse<PoImportCsvResult>> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<PoImportCsvResult>("po/import/csv", {
    method: "POST",
    body: form,
    accessToken,
  });
}

export async function listPoImportHistory(
  accessToken: string | null,
  limit = 20
): Promise<ApiResponse<PoImportHistoryItem[]>> {
  const q = new URLSearchParams({ limit: String(limit) });
  return apiGet<PoImportHistoryItem[]>(`po/import/history?${q.toString()}`, accessToken);
}

export async function downloadPoImportTemplate(accessToken: string | null): Promise<Blob> {
  const url = `${config.apiBaseUrl}/po/import/template-csv`;
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    throw new Error("Failed to download template");
  }
  return res.blob();
}

