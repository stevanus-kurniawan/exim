-- Weights moved to imported_po_intake_items (per line).
ALTER TABLE shipments DROP COLUMN IF EXISTS net_weight_mt;
ALTER TABLE shipments DROP COLUMN IF EXISTS gross_weight_mt;
