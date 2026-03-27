/**
 * PO test data: final structure for testing (POST /po-intake or test-create).
 * Rule: 1 PO = multiple items, 1 incoterm. 1 Shipment = multiple POs, 1 incoterm.
 * Fields: Plant, PO Number, Supplier name, Items (Qty, Unit, Value), Incoterms.
 */

import type { CreatePoIntakeDto } from "./dto/index.js";

/** Sample PO create payload (POST /po-intake). */
export const sampleCreatePoIntake: CreatePoIntakeDto = {
  external_id: "EXT-PO-2026-001",
  po_number: "PO-2026-0001",
  plant: "PLANT-JKT",
  supplier_name: "Global Parts Ltd",
  delivery_location: "Jakarta Warehouse",
  incoterm_location: "FOB",
  items: [
    { item_description: "Industrial Pump A", qty: 2, unit: "PCS", value: 12500 },
    { item_description: "Valve Set B", qty: 10, unit: "SET", value: 3500 },
  ],
};

/** Second sample PO (multiple items, one incoterm per PO). */
export const sampleCreatePoIntake2: CreatePoIntakeDto = {
  external_id: "EXT-PO-2026-002",
  po_number: "PO-2026-0002",
  plant: "PLANT-SBY",
  supplier_name: "Asia Machinery Co",
  incoterm_location: "CIF",
  items: [
    { item_description: "Motor 5HP", qty: 1, unit: "PCS", value: 8000 },
    { item_description: "Belt Drive", qty: 3, unit: "PCS", value: 1200 },
  ],
};

/** All sample create DTOs for bulk test. */
export const sampleCreatePoIntakes: CreatePoIntakeDto[] = [
  sampleCreatePoIntake,
  sampleCreatePoIntake2,
];
