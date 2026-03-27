-- Product classification (dropdown on UI). Package / 20′ ISO tank counts for LCL & FCL units.

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS product_classification VARCHAR(50),
  ADD COLUMN IF NOT EXISTS package_count INTEGER,
  ADD COLUMN IF NOT EXISTS container_count_20_iso_tank INTEGER;

COMMENT ON COLUMN shipments.product_classification IS 'Chemical, Packaging, or Spare Parts';
COMMENT ON COLUMN shipments.package_count IS 'LCL: number of packages when unit_package is true';
COMMENT ON COLUMN shipments.container_count_20_iso_tank IS 'FCL: number of 20′ ISO tanks when unit_20_iso_tank is true';
