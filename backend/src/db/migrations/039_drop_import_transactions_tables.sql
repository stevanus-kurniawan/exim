-- Drop legacy import transaction tables.
-- CASCADE is required because other legacy tables keep FKs to import_transactions.

DROP TABLE IF EXISTS import_transaction_status_history;

DROP TABLE IF EXISTS document_versions;

DROP TABLE IF EXISTS transaction_documents CASCADE;

DROP TABLE IF EXISTS transaction_notes;

DROP TABLE IF EXISTS import_transactions CASCADE;
