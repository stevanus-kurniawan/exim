-- Configurable PPN / PPH percentages per shipment (defaults match prior hardcoded 11% and 2.5%).

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS ppn_percentage NUMERIC(5, 2) DEFAULT 11;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pph_percentage NUMERIC(5, 2) DEFAULT 2.5;

COMMENT ON COLUMN shipments.ppn_percentage IS 'PPN as percent of (total PO amount + BM), e.g. 11 for 11%';
COMMENT ON COLUMN shipments.pph_percentage IS 'PPH as percent of (total PO amount + BM), e.g. 2.5 for 2.5%';
