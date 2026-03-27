/**
 * Incoterm-aware shipment status order (matches frontEnd/lib/shipment-status-requirements.ts).
 * EXW/FCA/FOB: buyer arranges transport → BIDDING_TRANSPORTER is a step.
 * Other incoterms: that step is skipped in the applicable chain.
 */

import { SHIPMENT_STATUSES } from "../dto/index.js";

const INCOTERMS_WITH_BIDDING_TRANSPORTER = ["EXW", "FCA", "FOB"] as const;

function normalizeIncoterm(incoterm: string | null | undefined): string {
  return (incoterm ?? "").trim().toUpperCase();
}

function hasBiddingTransporterStep(incoterm: string | null | undefined): boolean {
  const n = normalizeIncoterm(incoterm);
  return INCOTERMS_WITH_BIDDING_TRANSPORTER.includes(
    n as (typeof INCOTERMS_WITH_BIDDING_TRANSPORTER)[number]
  );
}

export function getApplicableShipmentStatuses(incoterm: string | null | undefined): string[] {
  if (hasBiddingTransporterStep(incoterm)) return [...SHIPMENT_STATUSES];
  return SHIPMENT_STATUSES.filter((s) => s !== "BIDDING_TRANSPORTER");
}

/**
 * True if newStatus is strictly later than currentStatus in the incoterm-applicable chain.
 * Intermediate statuses may be skipped (same idea as frontEnd getStatusesRequiredForTransition).
 */
export function isShipmentAllowedForwardTransition(
  currentStatus: string,
  newStatus: string,
  incoterm: string | null | undefined
): boolean {
  const chain = getApplicableShipmentStatuses(incoterm);
  const cur = chain.indexOf(currentStatus);
  const next = chain.indexOf(newStatus);
  if (cur === -1 || next === -1) return false;
  return next > cur;
}

export function getNextAllowedShipmentStatus(
  currentStatus: string,
  incoterm: string | null | undefined
): string | null {
  const chain = getApplicableShipmentStatuses(incoterm);
  const cur = chain.indexOf(currentStatus);
  if (cur === -1 || cur >= chain.length - 1) return null;
  return chain[cur + 1] ?? null;
}
