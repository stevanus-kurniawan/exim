-- Shipments: main operational monitoring entity. Replaces import_transaction as the shipment lifecycle owner.

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_no VARCHAR(50) NOT NULL UNIQUE,
  vendor_code VARCHAR(50),
  vendor_name VARCHAR(255),
  forwarder_code VARCHAR(50),
  forwarder_name VARCHAR(255),
  warehouse_code VARCHAR(50),
  warehouse_name VARCHAR(255),
  incoterm VARCHAR(20),
  shipment_method VARCHAR(20),
  origin_port_code VARCHAR(50),
  origin_port_name VARCHAR(255),
  origin_port_country VARCHAR(100),
  destination_port_code VARCHAR(50),
  destination_port_name VARCHAR(255),
  destination_port_country VARCHAR(100),
  etd TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  current_status VARCHAR(50) NOT NULL DEFAULT 'INITIATE_SHIPPING_DOCUMENT',
  closed_at TIMESTAMPTZ,
  close_reason TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_shipment_no ON shipments (shipment_no);
CREATE INDEX IF NOT EXISTS idx_shipments_current_status ON shipments (current_status);
CREATE INDEX IF NOT EXISTS idx_shipments_eta ON shipments (eta);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments (created_at);
