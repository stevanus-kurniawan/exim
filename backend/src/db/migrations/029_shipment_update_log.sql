-- Audit trail for PUT /shipments/:id (Update shipment) — shown in activity log ribbon.

CREATE TABLE IF NOT EXISTS shipment_update_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fields_changed JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_shipment_update_log_shipment_changed
  ON shipment_update_log (shipment_id, changed_at DESC);
