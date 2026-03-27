-- PO and Packing list files are scoped to a linked PO (intake) when shipment has multiple POs.

ALTER TABLE shipment_documents
  ADD COLUMN IF NOT EXISTS intake_id UUID REFERENCES imported_po_intake (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_documents_shipment_type_intake
  ON shipment_documents (shipment_id, document_type, intake_id);
