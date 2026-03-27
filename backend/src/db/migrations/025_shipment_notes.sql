-- Shipment discussion notes (comments): many per shipment, with author and timestamp.

CREATE TABLE IF NOT EXISTS shipment_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by_user_id UUID,
  created_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_notes_shipment_id ON shipment_notes (shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_notes_created_at ON shipment_notes (shipment_id, created_at DESC);
