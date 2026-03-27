-- Surveyor: Yes / No on shipment header.

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS surveyor VARCHAR(10);

COMMENT ON COLUMN shipments.surveyor IS 'Yes or No';
