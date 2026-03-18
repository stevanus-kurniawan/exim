-- BM percentage: user-entered percentage. BM no longer tied to COO for display/PDRI.

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bm_percentage NUMERIC(5, 2);

COMMENT ON COLUMN shipments.bm IS 'Bea Masuk (amount)';
COMMENT ON COLUMN shipments.bm_percentage IS 'BM percentage (user-entered, e.g. 7.5 for 7.5%)';
