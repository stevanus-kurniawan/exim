/**
 * Dashboard API — services layer. All dashboard API calls go through here.
 */

import { listPo } from "./po-service";
import { listShipments } from "./shipments-service";
import { apiGet } from "./api-client";
import type { ApiResponse } from "@/types/api";
import type { DeliveredManagementItem, DeliveredManagementQuery } from "@/types/dashboard";

/** Counts for dashboard: new PO detected (NEW_PO_DETECTED), claimed awaiting allocation (CLAIMED). Rejects if API errors. */
export async function getPoDashboardCounts(accessToken: string | null): Promise<{
  newPoDetected: number;
  awaitingAssignment: number;
}> {
  let newPoDetected = 0;
  let awaitingAssignment = 0;
  if (!accessToken) return { newPoDetected, awaitingAssignment };
  const [r1, r2] = await Promise.all([
    listPo({ page: 1, limit: 1, intake_status: "NEW_PO_DETECTED" }, accessToken),
    listPo({ page: 1, limit: 1, intake_status: "CLAIMED" }, accessToken),
  ]);
  if (!r1.success) throw new Error(r1.message ?? "Failed to load PO counts");
  if (!r2.success) throw new Error(r2.message ?? "Failed to load PO counts");
  if (r1.meta && typeof r1.meta.total === "number") newPoDetected = r1.meta.total;
  if (r2.meta && typeof r2.meta.total === "number") awaitingAssignment = r2.meta.total;
  return { newPoDetected, awaitingAssignment };
}

/** Counts for dashboard: active shipments, customs clearance, delivered. Rejects if API errors. */
export async function getShipmentDashboardCounts(accessToken: string | null): Promise<{
  activeShipments: number;
  customsClearance: number;
  delivered: number;
}> {
  let activeShipments = 0;
  let customsClearance = 0;
  let delivered = 0;
  if (!accessToken) return { activeShipments, customsClearance, delivered };
  const [rActive, rCustoms, rDelivered] = await Promise.all([
    listShipments({ page: 1, limit: 1, active_pipeline: true }, accessToken),
    listShipments({ page: 1, limit: 1, status: "CUSTOMS_CLEARANCE" }, accessToken),
    listShipments({ page: 1, limit: 1, status: "DELIVERED" }, accessToken),
  ]);
  if (!rActive.success) throw new Error(rActive.message ?? "Failed to load shipment counts");
  if (!rCustoms.success) throw new Error(rCustoms.message ?? "Failed to load shipment counts");
  if (!rDelivered.success) throw new Error(rDelivered.message ?? "Failed to load shipment counts");
  if (rActive.meta && typeof rActive.meta.total === "number") activeShipments = rActive.meta.total;
  if (rCustoms.meta && typeof rCustoms.meta.total === "number") customsClearance = rCustoms.meta.total;
  if (rDelivered.meta && typeof rDelivered.meta.total === "number") delivered = rDelivered.meta.total;
  return { activeShipments, customsClearance, delivered };
}

export async function getDeliveredManagementSummary(
  query: DeliveredManagementQuery,
  accessToken: string | null
): Promise<ApiResponse<DeliveredManagementItem[]>> {
  const params = new URLSearchParams();
  if (query.month != null) params.set("month", String(query.month));
  if (query.year != null) params.set("year", String(query.year));
  const qs = params.toString();
  return apiGet<DeliveredManagementItem[]>(
    `dashboard/delivered-management${qs ? `?${qs}` : ""}`,
    accessToken
  );
}
