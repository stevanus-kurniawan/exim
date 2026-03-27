/**
 * Allowed shipment document categories for upload API and UI.
 * BL uses status DRAFT or FINAL; Commercial Invoice (INVOICE) and others use status null.
 * intake_id required only for PO (per linked PO).
 */

export const SHIPMENT_DOCUMENT_TYPES = [
  "PO",
  "INVOICE",
  "BL",
  "COO",
  "INSURANCE",
  "PACKING_LIST",
  "PIB_BC",
  "SPPB",
  "FORWARDER_QUOTATION",
  "LS",
  "VO",
  "SPPBMCP",
  "MSDS",
  "B3",
  "DG",
] as const;

export type ShipmentDocumentType = (typeof SHIPMENT_DOCUMENT_TYPES)[number];

export const SHIPMENT_DOCUMENT_STATUSES = ["DRAFT", "FINAL"] as const;
export type ShipmentDocumentStatus = (typeof SHIPMENT_DOCUMENT_STATUSES)[number];

const REQUIRES_STATUS = new Set<ShipmentDocumentType>(["BL"]);

/** Only PO is scoped per linked intake; packing list is shipment-level. */
const REQUIRES_INTAKE_ID = new Set<ShipmentDocumentType>(["PO"]);

export function shipmentDocumentRequiresStatus(type: string): boolean {
  return REQUIRES_STATUS.has(type as ShipmentDocumentType);
}

export function shipmentDocumentRequiresIntakeId(type: string): boolean {
  return REQUIRES_INTAKE_ID.has(type as ShipmentDocumentType);
}

export function isAllowedShipmentDocumentType(type: string): type is ShipmentDocumentType {
  return (SHIPMENT_DOCUMENT_TYPES as readonly string[]).includes(type);
}
