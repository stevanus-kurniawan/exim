-- Store per-field before/after values for shipment update activity log readability.

ALTER TABLE shipment_update_log
  ADD COLUMN IF NOT EXISTS field_changes JSONB NOT NULL DEFAULT '[]'::jsonb;

