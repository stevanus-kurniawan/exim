/**
 * PO API — services layer. All PO (imported PO intake) API calls go through here.
 */

import { apiGet, apiPost } from "./api-client";
import type { PoListItem, PoDetail, ListPoQuery, CreateTestPoPayload } from "@/types/po";
import type { ApiResponse } from "@/types/api";

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

