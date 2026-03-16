-- Shipment: Amount of incoterms (service & charge), BM (Bea Masuk). PDRI = BM + PPN + PPH (computed).

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS incoterm_amount NUMERIC(18, 4),
  ADD COLUMN IF NOT EXISTS bm NUMERIC(18, 4);

COMMENT ON COLUMN shipments.incoterm_amount IS 'Service & charge (amount of incoterms)';
COMMENT ON COLUMN shipments.bm IS 'Bea Masuk; display 0 when COO is null';
