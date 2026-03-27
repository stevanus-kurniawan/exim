-- Actual departure/arrival times and depo (warehouse drop) fields for shipments.

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS atd TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ata TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS depo BOOLEAN,
  ADD COLUMN IF NOT EXISTS depo_location TEXT;
