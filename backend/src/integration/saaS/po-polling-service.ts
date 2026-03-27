/**
 * PO polling service: runs every 5 minutes, calls external API, detects new PO, stores imported PO intake.
 * Notification to import users can be wired here (in-app or push).
 */

import { PoIntakeRepository } from "../../modules/po-intake/repositories/po-intake.repository.js";
import type { IPoApiClient, SaasPoResponse } from "./types.js";
import { logger } from "../../utils/logger.js";

export interface PoPollingServiceOptions {
  intervalMs: number;
  poApiClient: IPoApiClient;
}

function toCreateDto(po: SaasPoResponse): {
  external_id: string;
  po_number: string;
  plant?: string;
  supplier_name: string;
  delivery_location?: string;
  incoterm_location?: string;
  kawasan_berikat?: string;
  items?: { item_description?: string; qty?: number; unit?: string; value?: number }[];
} {
  return {
    external_id: po.external_id,
    po_number: po.po_number,
    plant: po.plant,
    supplier_name: po.supplier_name,
    delivery_location: po.delivery_location,
    incoterm_location: po.incoterm_location,
    kawasan_berikat: po.kawasan_berikat,
    items: po.items?.map((it) => ({
      item_description: it.item_description,
      qty: it.qty,
      unit: it.unit,
      value: it.value,
    })),
  };
}

export async function runPoPollingCycle(
  repo: PoIntakeRepository,
  client: IPoApiClient
): Promise<{ ingested: number; duplicates: number }> {
  let ingested = 0;
  let duplicates = 0;

  try {
    const newPos = await client.fetchNewImportPos();
    for (const po of newPos) {
      try {
        const exists = await repo.existsByExternalId(po.external_id);
        if (exists) {
          duplicates += 1;
          continue;
        }
        const dto = toCreateDto(po);
        const row = await repo.create(dto, "NEW_PO_DETECTED");
        await repo.insertItems(row.id, dto.items);
        ingested += 1;
      } catch (err) {
        const msg = String(err);
        if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists")) {
          duplicates += 1;
        } else {
          logger.warn("PO ingestion failed", { external_id: po.external_id, error: msg });
        }
      }
    }
    if (ingested > 0) {
      logger.info("PO polling cycle completed", { ingested, duplicates });
    }
  } catch (err) {
    logger.error("PO polling cycle failed", { error: String(err) });
  }

  return { ingested, duplicates };
}

let pollingIntervalId: ReturnType<typeof setInterval> | null = null;

export function startPoPolling(repo: PoIntakeRepository, client: IPoApiClient, intervalMs: number): void {
  if (pollingIntervalId != null) {
    logger.warn("PO polling already started");
    return;
  }
  const run = () => runPoPollingCycle(repo, client);
  run();
  pollingIntervalId = setInterval(run, intervalMs);
  logger.info("PO polling started", { intervalMs });
}

export function stopPoPolling(): void {
  if (pollingIntervalId != null) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
    logger.info("PO polling stopped");
  }
}
