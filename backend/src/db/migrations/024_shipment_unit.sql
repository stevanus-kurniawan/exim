-- Shipment "Unit" selections (container / package types) under pre-shipment details.

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS unit_20ft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_40ft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_package BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_20_iso_tank BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS container_count_20ft INTEGER,
  ADD COLUMN IF NOT EXISTS container_count_40ft INTEGER;
