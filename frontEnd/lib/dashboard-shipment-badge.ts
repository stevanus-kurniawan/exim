import type { ShipmentStatus } from "@/types/shipments";

/** Maps API status → CSS module key for dashboard Recent Shipments badges (timeline-aligned). */
export type DashboardShipmentBadgeVariant = "delivered" | "green" | "blue" | "slate";

/**
 * Badge styling for dashboard rows — matches timeline groups:
 * Delivered (red); Customs / On Shipment / Picked Up (green); Transport Confirmed (blue);
 * Initiate / Ready Pickup (slate). Other statuses (e.g. Bidding) use slate.
 */
export function dashboardShipmentBadgeVariant(status: string | ShipmentStatus): DashboardShipmentBadgeVariant {
  const s = status.toUpperCase();
  if (s === "DELIVERED") return "delivered";
  if (s === "CUSTOMS_CLEARANCE" || s === "ON_SHIPMENT" || s === "PICKED_UP") return "green";
  if (s === "TRANSPORT_CONFIRMED") return "blue";
  if (s === "INITIATE_SHIPPING_DOCUMENT" || s === "READY_PICKUP") return "slate";
  return "slate";
}
