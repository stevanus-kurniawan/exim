-- Rename PO intake tables and reshape item amounts.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'imported_po_intake'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'import_purchase_order'
  ) THEN
    ALTER TABLE imported_po_intake RENAME TO import_purchase_order;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'imported_po_intake_items'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'import_purchase_order_items'
  ) THEN
    ALTER TABLE imported_po_intake_items RENAME TO import_purchase_order_items;
  END IF;
END $$;

-- Align names with business terms.
ALTER TABLE IF EXISTS import_purchase_order
  ADD COLUMN IF NOT EXISTS total_amount_po NUMERIC(18, 4) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_purchase_order_items' AND column_name = 'value'
  ) THEN
    ALTER TABLE import_purchase_order_items RENAME COLUMN value TO unit_price;
  END IF;
END $$;

ALTER TABLE IF EXISTS import_purchase_order_items
  ADD COLUMN IF NOT EXISTS total_amount_item NUMERIC(18, 4);

-- Remove no-longer-used columns.
ALTER TABLE IF EXISTS import_purchase_order_items
  DROP COLUMN IF EXISTS kurs,
  DROP COLUMN IF EXISTS net_weight_mt,
  DROP COLUMN IF EXISTS gross_weight_mt;

-- Backfill totals from unit_price * qty.
UPDATE import_purchase_order_items
SET total_amount_item = COALESCE(unit_price, 0) * COALESCE(qty, 0)
WHERE total_amount_item IS NULL;

UPDATE import_purchase_order p
SET total_amount_po = COALESCE(x.total, 0)
FROM (
  SELECT intake_id, SUM(COALESCE(total_amount_item, 0))::NUMERIC(18, 4) AS total
  FROM import_purchase_order_items
  GROUP BY intake_id
) x
WHERE x.intake_id = p.id;

UPDATE import_purchase_order
SET total_amount_po = 0
WHERE total_amount_po IS NULL;

-- Keep index names aligned with new table names.
DO $$
BEGIN
  IF to_regclass('public.idx_imported_po_intake_external_id') IS NOT NULL
     AND to_regclass('public.idx_import_purchase_order_external_id') IS NULL THEN
    ALTER INDEX idx_imported_po_intake_external_id RENAME TO idx_import_purchase_order_external_id;
  END IF;

  IF to_regclass('public.idx_imported_po_intake_intake_status') IS NOT NULL
     AND to_regclass('public.idx_import_purchase_order_intake_status') IS NULL THEN
    ALTER INDEX idx_imported_po_intake_intake_status RENAME TO idx_import_purchase_order_intake_status;
  END IF;

  IF to_regclass('public.idx_imported_po_intake_po_number') IS NOT NULL
     AND to_regclass('public.idx_import_purchase_order_po_number') IS NULL THEN
    ALTER INDEX idx_imported_po_intake_po_number RENAME TO idx_import_purchase_order_po_number;
  END IF;

  IF to_regclass('public.idx_imported_po_intake_created_at') IS NOT NULL
     AND to_regclass('public.idx_import_purchase_order_created_at') IS NULL THEN
    ALTER INDEX idx_imported_po_intake_created_at RENAME TO idx_import_purchase_order_created_at;
  END IF;

  IF to_regclass('public.idx_imported_po_intake_pt') IS NOT NULL
     AND to_regclass('public.idx_import_purchase_order_pt') IS NULL THEN
    ALTER INDEX idx_imported_po_intake_pt RENAME TO idx_import_purchase_order_pt;
  END IF;

  IF to_regclass('public.idx_imported_po_intake_po_date') IS NOT NULL
     AND to_regclass('public.idx_import_purchase_order_po_date') IS NULL THEN
    ALTER INDEX idx_imported_po_intake_po_date RENAME TO idx_import_purchase_order_po_date;
  END IF;

  IF to_regclass('public.idx_imported_po_intake_plant') IS NOT NULL
     AND to_regclass('public.idx_import_purchase_order_plant') IS NULL THEN
    ALTER INDEX idx_imported_po_intake_plant RENAME TO idx_import_purchase_order_plant;
  END IF;

  IF to_regclass('public.idx_imported_po_intake_items_intake_id') IS NOT NULL
     AND to_regclass('public.idx_import_purchase_order_items_intake_id') IS NULL THEN
    ALTER INDEX idx_imported_po_intake_items_intake_id RENAME TO idx_import_purchase_order_items_intake_id;
  END IF;
END $$;
