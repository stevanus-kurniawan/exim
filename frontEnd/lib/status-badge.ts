/**
 * Map status to Badge variant — intake (PO) and shipment statuses. Enterprise-style, consistent.
 */

import type { BadgeVariant } from "@/components/badges";

const SHIPMENT_SUCCESS = "DELIVERED";
const INTAKE_GROUPED = "GROUPED_TO_SHIPMENT";
const INTAKE_TAKEN = "TAKEN_BY_EXIM";

export function statusToBadgeVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (s === SHIPMENT_SUCCESS || s === INTAKE_GROUPED) return "success";
  if (s === "CUSTOMS_CLEARANCE" || s === INTAKE_TAKEN) return "warning";
  return "neutral";
}

/** Intake (PO) status: emphasize new/notified vs taken vs grouped. */
export function intakeStatusToBadgeVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (s === "NEW_PO_DETECTED" || s === "NOTIFIED") return "default";
  if (s === INTAKE_TAKEN) return "warning";
  if (s === INTAKE_GROUPED) return "success";
  return "neutral";
}

export function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
