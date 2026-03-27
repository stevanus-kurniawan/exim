-- Net / gross weight at delivery (metric tons).

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS net_weight_mt NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS gross_weight_mt NUMERIC(18, 6);

COMMENT ON COLUMN shipments.net_weight_mt IS 'Net weight at delivery (metric tons)';
COMMENT ON COLUMN shipments.gross_weight_mt IS 'Gross weight at delivery (metric tons)';
