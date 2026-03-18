-- Kawasan berikat: pre-filled from PO when shipment is created from PO.

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS kawasan_berikat VARCHAR(255);
