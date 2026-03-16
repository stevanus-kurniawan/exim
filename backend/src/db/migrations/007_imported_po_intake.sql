-- Imported PO intake: PO ingested from external SaaS. Prevents duplicate ingestion; tracks intake status and EXIM assignment.

CREATE TABLE IF NOT EXISTS imported_po_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(255) NOT NULL,
  po_number VARCHAR(100) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  delivery_location VARCHAR(255),
  incoterm_location VARCHAR(255),
  kawasan_berikat VARCHAR(255),
  intake_status VARCHAR(50) NOT NULL DEFAULT 'NEW_PO_DETECTED',
  taken_by_user_id VARCHAR(255),
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS imported_po_intake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES imported_po_intake (id) ON DELETE CASCADE,
  line_number INT NOT NULL DEFAULT 1,
  item_description VARCHAR(500),
  qty NUMERIC(18, 4),
  unit VARCHAR(50),
  kurs NUMERIC(18, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imported_po_intake_external_id ON imported_po_intake (external_id);
CREATE INDEX IF NOT EXISTS idx_imported_po_intake_intake_status ON imported_po_intake (intake_status);
CREATE INDEX IF NOT EXISTS idx_imported_po_intake_po_number ON imported_po_intake (po_number);
CREATE INDEX IF NOT EXISTS idx_imported_po_intake_created_at ON imported_po_intake (created_at);
CREATE INDEX IF NOT EXISTS idx_imported_po_intake_items_intake_id ON imported_po_intake_items (intake_id);
