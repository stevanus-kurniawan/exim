-- Import transactions (API Spec §5.4, ERD snapshot pattern).
-- Stable snapshot columns for audit/history; no file storage coupling.

CREATE TABLE IF NOT EXISTS import_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_no VARCHAR(50) NOT NULL UNIQUE,
  vendor_code VARCHAR(50),
  vendor_name VARCHAR(255),
  supplier_country VARCHAR(100),
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
  po_number VARCHAR(100),
  purchase_request_number VARCHAR(100),
  item_name VARCHAR(255),
  item_category VARCHAR(100),
  currency VARCHAR(10),
  estimated_value NUMERIC(18, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_transactions_transaction_no ON import_transactions (transaction_no);
CREATE INDEX IF NOT EXISTS idx_import_transactions_current_status ON import_transactions (current_status);
CREATE INDEX IF NOT EXISTS idx_import_transactions_eta ON import_transactions (eta);
CREATE INDEX IF NOT EXISTS idx_import_transactions_origin_dest ON import_transactions (origin_port_code, destination_port_code);
CREATE INDEX IF NOT EXISTS idx_import_transactions_vendor_name ON import_transactions (vendor_name);
CREATE INDEX IF NOT EXISTS idx_import_transactions_po_number ON import_transactions (po_number);
CREATE INDEX IF NOT EXISTS idx_import_transactions_created_at ON import_transactions (created_at);
