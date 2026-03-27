/**
 * Shipment status service: transition logic and timeline. Forward-only transitions.
 */

import { ShipmentRepository } from "../repositories/shipment.repository.js";
import { ShipmentStatusHistoryRepository } from "../repositories/shipment-status-history.repository.js";
import { AppError } from "../../../middlewares/errorHandler.js";
import {
  SHIPMENT_STATUSES,
  type TimelineEntry,
  type UpdateStatusResponseData,
  type StatusSummaryData,
} from "../dto/index.js";
import { getNextAllowedShipmentStatus, isShipmentAllowedForwardTransition } from "../utils/shipment-status-chain.js";
import { syncPoIntakeStatusesForShipment } from "../../po-intake/services/po-intake-status-sync.service.js";

/** Full canonical chain (includes BIDDING_TRANSPORTER); any forward jump allowed (intermediate steps may be skipped). */
export function isAllowedShipmentStatusTransition(currentStatus: string, newStatus: string): boolean {
  const cur = SHIPMENT_STATUSES.indexOf(currentStatus as (typeof SHIPMENT_STATUSES)[number]);
  const next = SHIPMENT_STATUSES.indexOf(newStatus as (typeof SHIPMENT_STATUSES)[number]);
  if (cur === -1 || next === -1) return false;
  return next > cur;
}

export class ShipmentStatusService {
  constructor(
    private readonly shipmentRepo: ShipmentRepository,
    private readonly historyRepo: ShipmentStatusHistoryRepository
  ) {}

  async updateStatus(
    shipmentId: string,
    newStatus: string,
    remarks: string | null,
    changedBy: string
  ): Promise<UpdateStatusResponseData> {
    const shipment = await this.shipmentRepo.findById(shipmentId);
    if (!shipment) throw new AppError("Shipment not found", 404);
    if (shipment.closed_at && shipment.current_status === "DELIVERED") {
      throw new AppError("Cannot update status of a closed shipment", 409);
    }
    // Allow final transition to DELIVERED when closed_at is already set via shipment detail save.
    if (shipment.closed_at && newStatus !== "DELIVERED") {
      throw new AppError("Cannot update status of a closed shipment", 409);
    }

    const currentStatus = shipment.current_status;
    if (!isShipmentAllowedForwardTransition(currentStatus, newStatus, shipment.incoterm)) {
      const allowedNext = getNextAllowedShipmentStatus(currentStatus, shipment.incoterm);
      const hint = allowedNext
        ? ` You may set ${allowedNext} or any later status in the workflow.`
        : "";
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Only forward moves within the applicable lifecycle are allowed.${hint}`,
        409
      );
    }

    await this.historyRepo.create({
      shipmentId,
      previousStatus: currentStatus,
      newStatus,
      remarks,
      changedBy,
    });

    const updated = await this.shipmentRepo.updateCurrentStatus(shipmentId, newStatus);
    if (!updated) throw new AppError("Failed to update shipment status", 500);

    await syncPoIntakeStatusesForShipment(shipmentId);

    return {
      shipment_id: shipmentId,
      previous_status: currentStatus,
      current_status: newStatus,
      updated_at: updated.updated_at.toISOString(),
    };
  }

  async getTimeline(shipmentId: string): Promise<TimelineEntry[]> {
    const shipment = await this.shipmentRepo.findById(shipmentId);
    if (!shipment) return [];

    const rows = await this.historyRepo.findByShipmentId(shipmentId);
    if (rows.length === 0) {
      return [
        {
          sequence: 1,
          status: shipment.current_status,
          changed_at: shipment.created_at.toISOString(),
          changed_by: "System",
          remarks: null,
        },
      ];
    }

    /**
     * History rows only record `new_status` per transition. The very first status
     * (e.g. INITIATE_SHIPPING_DOCUMENT) is never stored as `new_status`, so we prepend
     * it using shipment creation time so the UI can show when that step applied.
     */
    const entries: TimelineEntry[] = [];
    const newStatuses = new Set(rows.map((r) => r.new_status));
    const first = rows[0];
    if (first.previous_status != null && !newStatuses.has(first.previous_status)) {
      entries.push({
        sequence: 1,
        status: first.previous_status,
        changed_at: shipment.created_at.toISOString(),
        changed_by: "System",
        remarks: null,
      });
    }

    /**
     * Remarks entered during transition belong to the status being exited (previous_status),
     * not the new status. Build a lookup so each timeline status row can show its own
     * exit remark.
     */
    const exitRemarkByStatus = new Map<string, string | null>();
    for (const row of rows) {
      if (row.previous_status) {
        exitRemarkByStatus.set(row.previous_status, row.remarks ?? null);
      }
    }

    for (const row of rows) {
      entries.push({
        sequence: entries.length + 1,
        status: row.new_status,
        changed_at: row.changed_at.toISOString(),
        changed_by: row.changed_by,
        remarks: exitRemarkByStatus.get(row.new_status) ?? null,
      });
    }

    // Attach first transition remark to the prepended initial status (if present).
    if (entries.length > 0) {
      const firstStatus = entries[0]?.status;
      if (firstStatus) {
        entries[0] = {
          ...entries[0],
          remarks: exitRemarkByStatus.get(firstStatus) ?? entries[0].remarks ?? null,
        };
      }
    }

    return entries.map((e, i) => ({ ...e, sequence: i + 1 }));
  }

  async getStatusSummary(shipmentId: string): Promise<StatusSummaryData | null> {
    const shipment = await this.shipmentRepo.findById(shipmentId);
    if (!shipment) return null;

    const rows = await this.historyRepo.findByShipmentId(shipmentId);
    const current = shipment.current_status;
    const lastEntry = rows[rows.length - 1];
    const previous = lastEntry ? lastEntry.previous_status : null;
    const lastUpdatedAt = lastEntry ? lastEntry.changed_at : shipment.updated_at;

    return {
      current_status: current,
      previous_status: previous,
      last_updated_at: lastUpdatedAt.toISOString(),
    };
  }
}
