-- PPN/PPH rates are configured via environment (PPN_PERCENTAGE, PPH_PERCENTAGE), not per row.

ALTER TABLE shipments DROP COLUMN IF EXISTS ppn_percentage;
ALTER TABLE shipments DROP COLUMN IF EXISTS pph_percentage;
