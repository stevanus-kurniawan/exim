-- Reintroduce shipment-level net/gross weight fields.
-- Weight is captured at shipment level (not per PO item).

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS net_weight_mt NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS gross_weight_mt NUMERIC(18, 6);
