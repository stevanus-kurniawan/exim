-- Net / gross weight per PO line (metric tons); typically same value on every line for a PO.
ALTER TABLE imported_po_intake_items
  ADD COLUMN IF NOT EXISTS net_weight_mt NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS gross_weight_mt NUMERIC(18, 6);

COMMENT ON COLUMN imported_po_intake_items.net_weight_mt IS 'Net weight (metric tons)';
COMMENT ON COLUMN imported_po_intake_items.gross_weight_mt IS 'Gross weight (metric tons)';
