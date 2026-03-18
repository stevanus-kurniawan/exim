-- Bidding transporter: forwarders participating in bidding per shipment (EXW/FCA/FOB).
-- Optional quotation document per bid. Column vendor_name renamed to forwarder_name in 017.

CREATE TABLE IF NOT EXISTS shipment_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  vendor_name VARCHAR(255) NOT NULL,
  service_amount NUMERIC(18, 2),
  duration VARCHAR(100),
  origin_port VARCHAR(255),
  destination_port VARCHAR(255),
  ship_via VARCHAR(20),
  quotation_file_name VARCHAR(255),
  quotation_storage_key VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_bids_shipment_id ON shipment_bids (shipment_id);
