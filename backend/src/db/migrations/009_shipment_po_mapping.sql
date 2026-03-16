-- Shipment-PO mapping: many-to-one (many POs per shipment). Couple/decouple with audit trail.

CREATE TABLE IF NOT EXISTS shipment_po_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES imported_po_intake (id) ON DELETE CASCADE,
  coupled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  coupled_by VARCHAR(255) NOT NULL,
  decoupled_at TIMESTAMPTZ,
  decoupled_by VARCHAR(255),
  decouple_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shipment_id, intake_id)
);

CREATE INDEX IF NOT EXISTS idx_shipment_po_mapping_shipment_id ON shipment_po_mapping (shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_po_mapping_intake_id ON shipment_po_mapping (intake_id);
CREATE INDEX IF NOT EXISTS idx_shipment_po_mapping_decoupled_at ON shipment_po_mapping (decoupled_at) WHERE decoupled_at IS NULL;
