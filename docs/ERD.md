# ERD

Database ERD - Revision 3

EXIM Operation System (EOS) - Import Phase 1

Updated to add origin port and destination port snapshot columns in import_transactions

1. Updated Core ERD

Figure 1. Updated core ERD with port snapshot columns added to import_transactions and document module deferred.

2. Corrected import_transactions MVP Columns

The table below lists the recommended transaction-level columns for the current MVP. Snapshot columns are intentionally stored directly in import_transactions rather than relying only on foreign-key joins to master data.

3. Reference + Snapshot Recommendation

Recommended pattern: use master tables such as vendors, forwarders, warehouses, and ports_master for dropdown selection and validation, then copy the selected business values into import_transactions as immutable snapshots when the transaction is created or confirmed.

This design supports faster operational reads, simpler export/reporting, and protects historical data when a master record name or code changes in the future.

4. Recommended Constraints

• UNIQUE import_transactions.transaction_no.

• UNIQUE import_transaction_po_links (transaction_id, po_id) to prevent duplicate PO linkage.

• INDEX import_transactions(current_status), import_transactions(eta), and import_transactions(origin_port_code, destination_port_code) for common operational filters.

• Do not overwrite stored snapshot values in import_transactions when master data changes later.

Revision summary: Document management remains deferred for the current MVP. The ERD keeps the snapshot approach in import_transactions and now explicitly adds origin_port_code / origin_port_name / origin_port_country and destination_port_code / destination_port_name / destination_port_country. This preserves historical shipment values and reduces read-time joins on operational screens.



Column | Type | Purpose / Note

id | uuid PK | Primary key

transaction_no | varchar(50) | Unique transaction number

vendor_code | varchar(50) | Snapshot copied from vendor master

vendor_name | varchar(255) | Snapshot copied from vendor master

forwarder_code | varchar(50) | Snapshot copied from forwarder master

forwarder_name | varchar(255) | Snapshot copied from forwarder master

warehouse_code | varchar(50) | Snapshot copied from warehouse master

warehouse_name | varchar(255) | Snapshot copied from warehouse master

incoterm | varchar(20) | EXW / FOB / CIF / etc.

shipment_method | varchar(20) | Sea / Air / Land if needed

origin_port_code | varchar(50) | Snapshot for port of loading / origin port

origin_port_name | varchar(255) | Snapshot for origin port display

origin_port_country | varchar(100) | Snapshot for origin port country

destination_port_code | varchar(50) | Snapshot for port of discharge / destination port

destination_port_name | varchar(255) | Snapshot for destination port display

destination_port_country | varchar(100) | Snapshot for destination port country

etd | timestamp | Estimated departure date/time

eta | timestamp | Estimated arrival date/time

current_status | varchar(50) | Current shipment status for list screen

created_at / updated_at | timestamp | Audit timestamps



Design choice | Benefit | Tradeoff

Store only FK in transaction | Strict normalization and smaller row size | More joins on list/report screens and historical labels can drift when master data changes

Store business snapshot in transaction | Fast reads and stable historical values | Intentional data duplication that must be populated carefully at save time

