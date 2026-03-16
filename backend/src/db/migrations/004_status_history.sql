-- Status timeline/history for import transactions (API Spec §5.5, cursor-rules).
-- Every status update creates a record; preserves previous_status, new_status, remarks, changed_by, changed_at.

CREATE TABLE IF NOT EXISTS import_transaction_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES import_transactions (id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  remarks TEXT,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_transaction_id ON import_transaction_status_history (transaction_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON import_transaction_status_history (changed_at);
