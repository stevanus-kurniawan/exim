-- Transaction notes (API Spec §5.8).

CREATE TABLE IF NOT EXISTS transaction_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES import_transactions (id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_notes_transaction_id ON transaction_notes (transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_notes_created_at ON transaction_notes (created_at);
