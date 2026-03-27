-- Optional PO document / order date for filtering and display; falls back to intake created date when null.

ALTER TABLE imported_po_intake
  ADD COLUMN IF NOT EXISTS po_date DATE;

CREATE INDEX IF NOT EXISTS idx_imported_po_intake_po_date ON imported_po_intake (po_date);
