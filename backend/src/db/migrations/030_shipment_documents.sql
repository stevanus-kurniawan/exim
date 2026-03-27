-- Shipment documents: local file storage key + metadata; typed categories (some with draft/final).

CREATE TABLE IF NOT EXISTS shipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  document_type VARCHAR(40) NOT NULL,
  status VARCHAR(10),
  original_file_name VARCHAR(512) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  mime_type VARCHAR(200),
  size_bytes BIGINT NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_documents_shipment_uploaded
  ON shipment_documents (shipment_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_shipment_documents_shipment_type_status
  ON shipment_documents (shipment_id, document_type, status);
