/**
 * Mock PO samples for testing when SaaS integration is not ready.
 * Final structure: Plant, PO Number, Supplier name, Items (Qty, Unit, Value), Incoterms (1 per PO).
 */

import type { SaasPoResponse } from "./types.js";

export const mockPoSamples: SaasPoResponse[] = [
  {
    external_id: "SAAS-PO-001",
    po_number: "PO-2026-0003",
    plant: "PLANT-JKT",
    supplier_name: "Euro Components GmbH",
    delivery_location: "Port of Jakarta",
    incoterm_location: "FOB",
    items: [
      { item_description: "Component X", qty: 5, unit: "PCS", value: 2000 },
      { item_description: "Component Y", qty: 20, unit: "UNIT", value: 150 },
    ],
  },
];
