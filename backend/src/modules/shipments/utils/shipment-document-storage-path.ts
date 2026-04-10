/**
 * Filing plan for shipment documents on shared storage:
 * Year / PT / Plant / {BC 2.0|BC 2.3|…} / {Vendor}__{PO or shipment ref} / file
 */

import type { PoIntakeRow } from "../../po-intake/dto/index.js";
import type { ShipmentRow } from "../dto/index.js";
import { pibTypeStorageFolderName } from "../../../shared/pib-type.js";

const MAX_SEGMENT = 120;

function segment(raw: string | null | undefined, fallback: string): string {
  const s = (raw != null ? String(raw) : "")
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, MAX_SEGMENT)
    .trim();
  return s || fallback;
}

function shipmentYearUtc(shipment: ShipmentRow): string {
  const d = shipment.etd ?? shipment.eta ?? shipment.created_at;
  return String(d.getUTCFullYear());
}

/**
 * Relative path (no leading slash) under STORAGE_LOCAL_PATH.
 */
export function buildShipmentDocumentDirectoryPrefix(
  shipment: ShipmentRow,
  intake: PoIntakeRow | null
): string {
  const year = shipmentYearUtc(shipment);
  const pt = intake ? segment(intake.pt, "_NO_PT") : "_NO_PT";
  const plant = intake ? segment(intake.plant, "_NO_PLANT") : "_NO_PLANT";
  const pibFolder = pibTypeStorageFolderName(shipment.pib_type);

  const vendor = segment(
    shipment.vendor_name ?? intake?.supplier_name ?? null,
    "NO_VENDOR"
  );
  const poOrRef = intake
    ? segment(intake.po_number, "NO_PO")
    : segment(shipment.shipment_no, "NO_SHIPMENT_NO");
  const vendorPo = `${vendor}__${poOrRef}`.slice(0, MAX_SEGMENT * 2);

  return [year, pt, plant, pibFolder, vendorPo].join("/");
}
