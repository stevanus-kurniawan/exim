-- PT (entity / company code on PO header), distinct from operational plant.
-- The Create PO screen already had a PT dropdown, but the API payload did not send `pt`
-- (only `plant` was persisted). This column stores the selected PT; apply migration and
-- ensure POST /po/test-create includes `pt` in the body.
ALTER TABLE imported_po_intake
  ADD COLUMN IF NOT EXISTS pt VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_imported_po_intake_pt ON imported_po_intake (pt);
