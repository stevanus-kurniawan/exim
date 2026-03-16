-- PO: add Plant (header); add Value per item. Final PO data: Plant, PO Number, Supplier name, Items (with Qty, Unit, Value), Incoterms (1 per PO).

ALTER TABLE imported_po_intake
  ADD COLUMN IF NOT EXISTS plant VARCHAR(100);

ALTER TABLE imported_po_intake_items
  ADD COLUMN IF NOT EXISTS value NUMERIC(18, 4);

CREATE INDEX IF NOT EXISTS idx_imported_po_intake_plant ON imported_po_intake (plant);
