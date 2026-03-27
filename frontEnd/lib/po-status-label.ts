/**
 * PO intake status labels (API uses SNAKE_CASE; UI shows title case phrases).
 */

const PO_STATUS_LABELS: Record<string, string> = {
  NEW_PO_DETECTED: "New PO detected",
  CLAIMED: "Claimed",
  ALLOCATION_IN_PROGRESS: "Allocation in progress",
  PARTIALLY_SHIPPED: "Partially shipped",
  SHIPPED: "Shipped",
  FULFILLED: "Fulfilled",
  // Legacy (until cache clears)
  NOTIFIED: "Notified",
  TAKEN_BY_EXIM: "Claimed",
  GROUPED_TO_SHIPMENT: "Allocation in progress",
};

export function formatPoStatusLabel(status: string): string {
  const key = status.toUpperCase();
  return PO_STATUS_LABELS[key] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
