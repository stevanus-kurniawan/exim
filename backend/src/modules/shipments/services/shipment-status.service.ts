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

const ORDERED_STATUSES = [...SHIPMENT_STATUSES];

function indexOfStatus(status: string): number {
  const i = ORDERED_STATUSES.indexOf(status as (typeof ORDERED_STATUSES)[number]);
  return i === -1 ? -1 : i;
}

export function isAllowedShipmentStatusTransition(currentStatus: string, newStatus: string): boolean {
  const cur = indexOfStatus(currentStatus);
  const next = indexOfStatus(newStatus);
  if (cur === -1 || next === -1) return false;
  return next === cur + 1;
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
    if (shipment.closed_at) {
      throw new AppError("Cannot update status of a closed shipment", 409);
    }

    const currentStatus = shipment.current_status;
    if (!isAllowedShipmentStatusTransition(currentStatus, newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Only forward transitions are allowed.`,
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
    return rows.map((row, i) => ({
      sequence: i + 1,
      status: row.new_status,
      changed_at: row.changed_at.toISOString(),
      changed_by: row.changed_by,
      remarks: row.remarks,
    }));
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
