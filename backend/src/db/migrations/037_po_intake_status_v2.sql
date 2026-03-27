-- PO intake lifecycle: remove NOTIFIED; rename TAKEN_BY_EXIM -> CLAIMED; GROUPED_TO_SHIPMENT -> ALLOCATION_IN_PROGRESS.
-- Finer states (PARTIALLY_SHIPPED, SHIPPED, FULFILLED) are reconciled by the app on read and on shipment events.

UPDATE imported_po_intake SET intake_status = 'NEW_PO_DETECTED' WHERE intake_status = 'NOTIFIED';
UPDATE imported_po_intake SET intake_status = 'CLAIMED' WHERE intake_status = 'TAKEN_BY_EXIM';
UPDATE imported_po_intake SET intake_status = 'ALLOCATION_IN_PROGRESS' WHERE intake_status = 'GROUPED_TO_SHIPMENT';
