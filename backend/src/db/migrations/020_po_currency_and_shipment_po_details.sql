-- PO: currency (e.g. USD, IDR). Shipment-PO: invoice_no, currency_rate. Per-shipment received qty per PO line.

ALTER TABLE imported_po_intake ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

ALTER TABLE shipment_po_mapping
  ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(255),
  ADD COLUMN IF NOT EXISTS currency_rate NUMERIC(18, 6);

CREATE TABLE IF NOT EXISTS shipment_po_line_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES imported_po_intake (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES imported_po_intake_items (id) ON DELETE CASCADE,
  received_qty NUMERIC(18, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shipment_id, intake_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_shipment_po_line_received_shipment_intake ON shipment_po_line_received (shipment_id, intake_id);
