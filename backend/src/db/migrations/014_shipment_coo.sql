-- Shipment details: COO (Certificate of Origin), nullable string.

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS coo VARCHAR(255);

COMMENT ON COLUMN shipments.coo IS 'Certificate of Origin';
