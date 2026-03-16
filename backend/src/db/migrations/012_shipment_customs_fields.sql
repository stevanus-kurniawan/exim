-- Shipment customs and shipment details: PIB type, Nopen, Ship by, BL/AWB, Insurance (PRD §8).

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS pib_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS no_request_pib VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nopen VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nopen_date DATE,
  ADD COLUMN IF NOT EXISTS ship_by VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bl_awb VARCHAR(255),
  ADD COLUMN IF NOT EXISTS insurance_no VARCHAR(255);

COMMENT ON COLUMN shipments.pib_type IS 'PIB 2.3, PIB 2.0, or Consignee Note';
COMMENT ON COLUMN shipments.ship_by IS 'Bulk, LCL, or FCL';
