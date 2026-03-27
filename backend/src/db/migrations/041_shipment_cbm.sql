-- Shipment CBM (Cubic Meter) field on shipment header details.
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS cbm NUMERIC(18, 6);

COMMENT ON COLUMN shipments.cbm IS 'Shipment volume in cubic meters (CBM)';
