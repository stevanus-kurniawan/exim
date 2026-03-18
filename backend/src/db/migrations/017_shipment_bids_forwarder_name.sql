-- Bidding participants are forwarders (delivery service companies), not vendors (suppliers).
-- Rename column for clarity. Idempotent: skip if already renamed (e.g. table created with forwarder_name).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shipment_bids' AND column_name = 'vendor_name'
  ) THEN
    ALTER TABLE shipment_bids RENAME COLUMN vendor_name TO forwarder_name;
  END IF;
END $$;
