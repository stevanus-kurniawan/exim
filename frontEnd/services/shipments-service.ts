/**
 * Shipments API — services layer. All shipment API calls go through here.
 */

import { apiGet, apiPost, apiPatch, apiPut } from "./api-client";
import type {
  ShipmentListItem,
  ShipmentDetail,
  ListShipmentsQuery,
  ShipmentTimelineEntry,
  ShipmentStatusSummaryData,
} from "@/types/shipments";
import type { ApiResponse } from "@/types/api";

function buildQueryString(query: ListShipmentsQuery): string {
  const params = new URLSearchParams();
  if (query.page != null) params.set("page", String(query.page));
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.supplier_name) params.set("supplier_name", query.supplier_name);
  if (query.po_number) params.set("po_number", query.po_number);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function listShipments(
  query: ListShipmentsQuery,
  accessToken: string | null
): Promise<ApiResponse<ShipmentListItem[]>> {
  const path = `shipments${buildQueryString(query)}`;
  return apiGet<ShipmentListItem[]>(path, accessToken);
}

export async function getShipmentDetail(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<ShipmentDetail>> {
  return apiGet<ShipmentDetail>(`shipments/${id}`, accessToken);
}

export interface UpdateShipmentPayload {
  eta?: string;
  remarks?: string;
  pib_type?: string;
  no_request_pib?: string;
  nopen?: string;
  nopen_date?: string;
  ship_by?: string;
  bl_awb?: string;
  insurance_no?: string;
  coo?: string;
  incoterm_amount?: number;
  bm?: number;
}

export async function updateShipment(
  id: string,
  payload: UpdateShipmentPayload,
  accessToken: string | null
): Promise<ApiResponse<ShipmentDetail>> {
  return apiPut<ShipmentDetail>(`shipments/${id}`, payload, accessToken);
}

export async function updateShipmentStatus(
  id: string,
  newStatus: string,
  remarks: string | undefined,
  accessToken: string | null
): Promise<ApiResponse<{ shipment_id: string; previous_status: string; current_status: string; updated_at: string }>> {
  return apiPatch(`shipments/${id}/status`, { new_status: newStatus, remarks }, accessToken);
}

export async function getShipmentTimeline(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<ShipmentTimelineEntry[]>> {
  return apiGet<ShipmentTimelineEntry[]>(`shipments/${id}/timeline`, accessToken);
}

export async function getShipmentStatusSummary(
  id: string,
  accessToken: string | null
): Promise<ApiResponse<ShipmentStatusSummaryData>> {
  return apiGet<ShipmentStatusSummaryData>(`shipments/${id}/status-summary`, accessToken);
}

export async function couplePo(
  shipmentId: string,
  intakeIds: string[],
  accessToken: string | null
): Promise<ApiResponse<ShipmentDetail>> {
  return apiPost<ShipmentDetail>(`shipments/${shipmentId}/couple-po`, { intake_ids: intakeIds }, accessToken);
}

export async function decouplePo(
  shipmentId: string,
  intakeId: string,
  reason: string | undefined,
  accessToken: string | null
): Promise<ApiResponse<unknown>> {
  return apiPost(`shipments/${shipmentId}/decouple-po`, { intake_id: intakeId, reason }, accessToken);
}

