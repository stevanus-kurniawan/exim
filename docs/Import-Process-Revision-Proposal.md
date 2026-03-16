# Import Process Revision — Analysis & Proposal

**Purpose:** Align EOS with the revised import process where POs are ingested from external SaaS and Shipment is the main operational entity. No code implementation in this document.

**Note:** A temporary "create PO" (or create intake/shipment) feature must remain available for end-to-end testing.

---

## Section 1: Current system assumptions that are now incorrect

### 1.1 Creation and ownership of PO/transaction

| Current assumption | Why it is incorrect |
|--------------------|---------------------|
| **EOS creates the import “transaction”** — User creates a transaction via `POST /import-transactions` with PO-like data (po_number, supplier, ports, eta, etc.). | **POs are created in external SaaS by Purchasing.** EOS does not create POs. EOS only **ingests** POs detected via polling the SaaS API. |
| **One transaction = one PO** — Table `import_transactions` stores a single `po_number`, `item_name`, `item_category`, `purchase_request_number`, `estimated_value`, etc. per row. | **One shipment can contain multiple POs.** The current model has no PO–shipment mapping; it conflates “transaction” with a single PO. |
| **EXIM creates the record to start monitoring** — Create flow is the entry point; status starts at `INITIATE_SHIPPING_DOCUMENT`. | **New POs are detected by polling.** EOS ingests them as **intake** records. EXIM then **reviews**, **takes ownership**, and **groups POs into shipments**. |

### 1.2 Single status layer

| Current assumption | Why it is incorrect |
|--------------------|---------------------|
| **Only one status flow** — `import_transactions.current_status` uses the 8-step shipment flow (INITIATE_SHIPPING_DOCUMENT → … → DELIVERED). | **Two status layers are required:** (1) **PO intake status** (NEW_PO_DETECTED, NOTIFIED, TAKEN_BY_EXIM, GROUPED_TO_SHIPMENT), (2) **Shipment status** (the existing 8 steps). Intake status applies to the ingested PO; shipment status applies to the shipment. |
| **Status history is tied to “transaction”** — `import_transaction_status_history` references `transaction_id` (current import_transactions.id). | After revision, **shipment** status history will reference **shipment** id; **intake** may have its own status/history for intake lifecycle. |

### 1.3 Data model and references

| Current assumption | Why it is incorrect |
|--------------------|---------------------|
| **“Import transaction” is the single operational entity** — Documents, notes, timeline, and dashboard all key off `import_transactions.id`. | **Shipment** is the main operational monitoring entity. **PO** is an external procurement reference (from SaaS). Documents, notes, and shipment timeline should attach to **shipment**, not to a 1:1 “transaction = PO” record. |
| **PO data is manually entered** — Create payload has po_number, supplier_name, origin/destination ports, eta, item_name, etc. | **PO data comes from SaaS:** po_number, supplier_name, delivery_location, incoterm_location, kawasan_berikat; **items** (item_description, qty, unit, kurs). Field names and structure differ from current create DTO. |
| **No concept of “intake” or “grouping”** — No tables or flows for “detected PO,” “notified,” “taken by EXIM,” or “grouped into shipment.” | **Intake lifecycle and grouping are core:** ingested PO → intake record → notification → EXIM takes ownership → EXIM groups PO(s) into shipment(s). Couple/decouple PO–shipment with audit trail is required. |

### 1.4 API and UX entry points

| Current assumption | Why it is incorrect |
|--------------------|---------------------|
| **Primary write entry is “Create import transaction”** — `POST /import-transactions` creates the main record. | **Primary creation is ingestion** (from poller). **Temporary create PO/intake** remains only for E2E testing. User-facing flows are: list intake POs → take ownership → create/assign shipment → couple/decouple POs. |
| **List/detail are “import transactions”** — List shows transaction_number, po_number, supplier, ports, status, eta. Detail shows one PO’s data plus timeline, documents, notes. | **Two main list/detail flows:** (1) **PO intake** — list intakes (filter by intake status), detail intake + take ownership / group to shipment; (2) **Shipments** — list shipments (filter by shipment status), detail shipment with linked POs, timeline, documents, notes. |
| **Dashboard aggregates “import transactions”** — total_transactions, in_progress, delivered, delayed; counts by current_status. | **Dashboard** should reflect **shipments** (and optionally intake counts). “Total transactions” → e.g. total shipments; status counts → shipment statuses. Intake metrics (e.g. new POs awaiting action) can be added. |

### 1.5 Naming and terminology

| Current | Revised (conceptual) |
|--------|----------------------|
| `import_transactions` table | Replaced by **shipments** (operational) + **imported_po_intake** (ingested PO) + **shipment_po_mapping** (link with audit). |
| “Transaction” in API paths (`/import-transactions`) | **Shipments** for operational endpoints; **PO intake** for intake endpoints. |
| `transaction_id` in status_history, documents, notes | **shipment_id** for shipment-scoped data. |

---

## Section 2: Proposed new domain model

### 2.1 Entity overview

| Entity | Purpose |
|--------|--------|
| **imported_po_intake** | One row per PO detected from SaaS. Holds ingested PO header + items; intake status (NEW_PO_DETECTED → NOTIFIED → TAKEN_BY_EXIM → GROUPED_TO_SHIPMENT). |
| **shipment** | Main operational monitoring entity. Snapshot/operational fields (e.g. forwarder, ports, etd, eta), **shipment** status (INITIATE_SHIPPING_DOCUMENT → … → DELIVERED). Replaces current “import_transaction” for operational tracking. |
| **shipment_po_mapping** | Many-to-one: many POs can be linked to one shipment. Supports **couple** (add PO to shipment) and **decouple** (remove PO from shipment). **Audit trail** (who linked/unlinked, when, optional reason). |

### 2.2 imported_po_intake

- **Source:** Created by **ingestion** (poller or temporary create for E2E), not by “create transaction” form.
- **Header fields (from SaaS):**  
  `po_number`, `supplier_name`, `delivery_location`, `incoterm_location`, `kawasan_berikat`, plus identifiers (e.g. external_system_id, ingested_at).
- **Items:** Stored as child rows or JSON: `item_description`, `qty`, `unit`, `kurs` (and any other item-level fields from SaaS).
- **Intake status:**  
  `NEW_PO_DETECTED` → `NOTIFIED` → `TAKEN_BY_EXIM` → `GROUPED_TO_SHIPMENT`.
- **Ownership:** When EXIM “takes ownership,” store e.g. `taken_by_user_id`, `taken_at`.
- **Relationship:** Once grouped, link via `shipment_po_mapping` (intake_id → shipment_id). One intake can be linked to at most one shipment at a time.

### 2.3 shipment

- **Replaces** current `import_transactions` for **operational** tracking.
- **Identification:** e.g. `shipment_no` (unique), id (UUID).
- **Snapshot/operational fields:** Forwarder, origin/destination ports, etd, eta, warehouse, incoterm, etc. (aligned with current snapshot pattern; can be filled when shipment is created or when first PO is coupled).
- **Shipment status:** Same 8 steps as today: INITIATE_SHIPPING_DOCUMENT → BIDDING_TRANSPORTER → TRANSPORT_CONFIRMED → READY_PICKUP → PICKED_UP → ON_SHIPMENT → CUSTOMS_CLEARANCE → DELIVERED.
- **Other:** closed_at, close_reason, remarks; created_at, updated_at.
- **Documents, notes, status timeline** attach to **shipment** (same behavior as today but with `shipment_id` instead of `transaction_id`).

### 2.4 shipment_po_mapping

- **Columns (conceptual):**  
  `id`, `shipment_id` (FK → shipment), `intake_id` (FK → imported_po_intake), `coupled_at`, `coupled_by`, `decoupled_at`, `decoupled_by`, `decouple_reason` (optional).  
  Either “current” mapping (decoupled_at IS NULL) or full history (keep rows when decoupled for audit).
- **Rules:**  
  - Couple: add row with decoupled_at NULL (and optionally soft-close previous mapping if one intake can only be in one shipment at a time).  
  - Decouple: set decoupled_at, decoupled_by, decouple_reason.  
  - Queries for “current POs on shipment” use mapping where decoupled_at IS NULL.

### 2.5 Data flow (high level)

1. **Poller** (or E2E “create PO”): Insert into `imported_po_intake` (status NEW_PO_DETECTED → NOTIFIED); push app notification to import users.
2. **EXIM** lists intakes, opens intake detail, “takes ownership” → intake status TAKEN_BY_EXIM.
3. **EXIM** creates a **shipment** (or selects existing) and **couples** one or more intakes to it → intake status GROUPED_TO_SHIPMENT; mapping rows created.
4. **Shipment** is then monitored as today: status updates, timeline, documents, notes, all by `shipment_id`.
5. **Decouple:** EXIM can remove a PO from a shipment (audit row updated or new row with decoupled_at set).

### 2.6 What happens to existing tables (conceptual)

- **import_transactions:** To be superseded by **shipments**. Migration strategy (rename vs new table + data migration) to be decided; behaviorally “transaction” becomes “shipment.”
- **import_transaction_status_history:** Becomes **shipment_status_history** (shipment_id, same status flow).
- **transaction_documents** → **shipment_documents** (shipment_id).
- **document_versions:** Stays; references document, which references shipment.
- **transaction_notes** → **shipment_notes** (shipment_id).
- **New:** imported_po_intake (and intake items if separate table), shipment_po_mapping; optionally intake_status_history if intake status changes are audited.

---

## Section 3: Backend modules to update

| Module | Current role | Changes required |
|--------|--------------|------------------|
| **import-transactions** | CRUD for `import_transactions`, list/detail/update/close. | **Rename/refocus to `shipments`:** Shipment CRUD, list/detail/update/close. Routes become e.g. `/shipments`. Repository and service work with `shipments` table and shipment status. **Keep temporary “create PO” or “create intake”** for E2E (e.g. dedicated route or flag). |
| **transaction-status** | Status transition and timeline for `import_transactions`. | **Refocus to shipment status:** Same transition rules and timeline, but keyed by `shipment_id`. Rename to e.g. **shipment-status**; status history table references shipment. |
| **documents** | Upload/list/get/delete by `transaction_id`. | **Attach to shipment:** Replace `transaction_id` with `shipment_id` in repository and service. Routes under e.g. `/shipments/:id/documents`. |
| **document-versions** | Versions per document (unchanged). | No entity rename; document belongs to shipment. |
| **notes** | Add/list notes by `transaction_id`. | **Attach to shipment:** Replace `transaction_id` with `shipment_id`. Routes under e.g. `/shipments/:id/notes`. |
| **dashboard** | Aggregates from `import_transactions`. | **Aggregate from `shipments`** (and optionally from `imported_po_intake`). Counts by **shipment** status; total/in progress/delivered/delayed based on shipments. Optionally add intake summary (e.g. new POs to process). |
| **New: po-intake (or imported-po-intake)** | — | **New module:** Ingest from SaaS (or temporary create for E2E), list intakes (filter by intake status), get intake detail, “take ownership,” and trigger/record notification. Persist to `imported_po_intake` (+ items). |
| **New: shipment-po-mapping** | — | **New module (or part of shipments):** Couple PO (intake) to shipment, decouple PO from shipment; list POs for a shipment; audit trail. |

**Additional backend work**

- **Poller / ingestion job:** New component (cron or worker) that calls SaaS API every 5 minutes, detects new Import POs, inserts into `imported_po_intake`, sets NOTIFIED, pushes app notification to import users. Not necessarily a “module” in the same sense; can live under a `jobs/` or `workers/` area.
- **Notifications:** Push “new Import PO” to all import users (in-app or external mechanism). New or extended module.
- **Config:** SaaS API base URL, credentials, poll interval; feature flag for “temporary create PO” for E2E.

**RBAC:** Permissions may need renaming (e.g. CREATE_TRANSACTION → CREATE_SHIPMENT, VIEW_TRANSACTIONS → VIEW_SHIPMENTS) and new ones (e.g. VIEW_PO_INTAKE, TAKE_OWNERSHIP, COUPLE_PO, DECOUPLE_PO). No code change in this doc.

---

## Section 4: Frontend screens to update

| Screen / area | Current behavior | Changes required |
|---------------|------------------|------------------|
| **Dashboard** | Summary cards (total/in progress/delivered/delayed), recent “transactions,” by-status counts; quick action “Create import transaction.” | **Shipment-centric:** Same cards but from **shipment** counts. Recent list = recent **shipments**. By-status = **shipment** statuses. Quick action: “Create shipment” (or “New shipment”) and/or link to **PO intake** list. Optionally show “New POs to process” (intake count). |
| **Import transactions list** | List of “import transactions” (transaction_number, po_number, supplier, origin, destination, status, eta); link to detail; “Create import transaction.” | **Split or pivot:** (1) **Shipments list** — shipment number, linked PO numbers (or count), supplier(s)/origin/destination, **shipment** status, eta; link to shipment detail. Primary action: create shipment (and optionally “Create PO for testing”). (2) **PO intake list** — intakes (po_number, supplier, delivery_location, intake status); take ownership, “Group to shipment.” |
| **Import transaction detail** | Single transaction detail: one PO’s data, status summary, timeline, documents, notes; update status; upload document; add note. | **Shipment detail:** Same structure but for **shipment:** linked POs (from mapping), shipment status, timeline, documents, notes. Actions: update **shipment** status, upload document, add note, **couple/decouple PO**. Display intake-derived PO data from linked intakes. |
| **Create import transaction (new)** | Form: po_number, supplier, ports, eta, item, etc.; submits POST /import-transactions. | **For E2E only:** Keep a **temporary “Create PO” or “Create intake”** flow that creates an intake record (and optionally triggers notification) so E2E tests can run without real SaaS. **Create shipment** flow: create shipment (possibly with initial coupled PO(s)) — different form/API. |
| **Navigation / routing** | `/dashboard`, `/dashboard/import-transactions`, `/dashboard/import-transactions/new`, `/dashboard/import-transactions/[id]`. | **Add/rename:** e.g. `/dashboard/shipments`, `/dashboard/shipments/new`, `/dashboard/shipments/[id]`; `/dashboard/po-intake` (or `/dashboard/intakes`), `/dashboard/po-intake/[id]`. Keep or alias old paths for E2E if needed. |
| **Types and services** | `ImportTransactionListItem`, `ImportTransactionDetail`, list/create/get/update/close, timeline, documents, notes. | **Shipment types and services:** Shipment list/detail, create shipment, update/close shipment, timeline/documents/notes by shipment_id. **Intake types and services:** Intake list/detail, take ownership, couple/decouple (or call shipment APIs that perform couple/decouple). |
| **Status badges / labels** | Single set of statuses (shipment flow). | **Two sets:** Intake status (NEW_PO_DETECTED, NOTIFIED, TAKEN_BY_EXIM, GROUPED_TO_SHIPMENT) and Shipment status (existing 8). Badge/label helpers must support both. |

---

## Section 5: API changes required

### 5.1 Rename / replace (transaction → shipment)

| Current | Proposed |
|---------|----------|
| `POST /import-transactions` | `POST /shipments` (create shipment; optionally accept initial PO intake ids to couple). **Keep** temporary `POST /import-transactions` or `POST /po-intake/test-create` for E2E if required. |
| `GET /import-transactions` | `GET /shipments` (list shipments; query: page, limit, status, search, supplier, po_number, from_date, to_date). |
| `GET /import-transactions/:id` | `GET /shipments/:id` (shipment detail including linked POs from mapping + intake data). |
| `PUT /import-transactions/:id` | `PUT /shipments/:id` (update shipment). |
| `PATCH /import-transactions/:id/close` | `PATCH /shipments/:id/close` (close shipment). |
| `POST /import-transactions/:id/status` | `POST /shipments/:id/status` (update **shipment** status; same body/response shape). |
| `GET /import-transactions/:id/timeline` | `GET /shipments/:id/timeline` (shipment status timeline). |
| `GET /import-transactions/:id/status-summary` | `GET /shipments/:id/status-summary` (shipment status summary). |
| `POST /import-transactions/:id/documents` | `POST /shipments/:id/documents` (upload document to shipment). |
| `GET /import-transactions/:id/documents` | `GET /shipments/:id/documents` (list shipment documents). |
| `POST /import-transactions/:id/notes` | `POST /shipments/:id/notes` (add note to shipment). |
| `GET /import-transactions/:id/notes` | `GET /shipments/:id/notes` (list shipment notes). |

Documents and versions by document id can stay as-is: `GET/DELETE /documents/:id`, `GET /documents/:id/download`, `POST/GET /documents/:id/versions/...`. Internally document is tied to `shipment_id`.

### 5.2 New endpoints (PO intake and mapping)

| Method | Endpoint | Purpose |
|--------|----------|--------|
| GET | `/po-intake` (or `/imported-po-intake`) | List intake records (query: page, limit, intake_status, search, po_number, supplier). |
| GET | `/po-intake/:id` | Get intake detail (header + items). |
| POST | `/po-intake/test-create` (or similar) | **Temporary for E2E:** Create an intake record with test data (mirrors SaaS payload: po_number, supplier_name, delivery_location, incoterm_location, kawasan_berikat, items). |
| POST | `/po-intake/:id/take-ownership` | Set intake status to TAKEN_BY_EXIM; set taken_by, taken_at. |
| POST | `/shipments/:id/po/couple` | Couple one or more intakes to shipment (body: intake_ids[]). Creates mapping; sets intake status to GROUPED_TO_SHIPMENT. |
| POST | `/shipments/:id/po/decouple` | Decouple an intake from shipment (body: intake_id, optional reason). Updates mapping (audit); may set intake status back (e.g. TAKEN_BY_EXIM). |
| GET | `/shipments/:id/po` | List POs currently linked to shipment (from mapping + intake data). |

### 5.3 Dashboard

| Current | Proposed |
|---------|----------|
| `GET /dashboard/import-summary` | `GET /dashboard/import-summary` (or `/dashboard/shipment-summary`): aggregate from **shipments** (total, in_progress, delivered, delayed). Optionally extend with intake counts (e.g. new_pos_detected, awaiting_ownership). |
| `GET /dashboard/import-status-summary` | Same path: counts by **shipment** current_status. |

### 5.4 Validation and response shapes

- **Shipment** create/update/close: align request/response with new shipment entity (shipment_no, snapshot fields, shipment status). List/detail responses include linked POs (from shipment_po_mapping + intake).
- **PO intake** list/detail: response shapes for intake (and items); intake status in response.
- **Couple/decouple:** Clear success/error messages; return updated shipment or mapping summary as needed.
- **Backward compatibility:** If old `/import-transactions` paths are kept for a transition period, document as deprecated and route to shipment logic where applicable.

---

## Summary

- **Section 1:** Current system assumes EOS creates a single “transaction” per PO and one status flow; the revised process assumes SaaS-owned POs, ingestion into intake, two status layers (intake + shipment), and shipment as the main entity with multiple POs.
- **Section 2:** New domain model: **imported_po_intake**, **shipment**, **shipment_po_mapping** with couple/decouple and audit; documents, notes, and status timeline attach to shipment.
- **Section 3:** Backend: import-transactions → shipments; transaction-status → shipment-status; documents/notes → shipment-scoped; dashboard → shipment (and optionally intake) aggregates; new modules po-intake and shipment-po-mapping; poller and notifications.
- **Section 4:** Frontend: dashboard and list/detail become shipment-centric; add PO intake list/detail and take-ownership/group flows; keep temporary create PO for E2E; two status label sets.
- **Section 5:** API: rename transaction endpoints to shipment; add po-intake and couple/decouple endpoints; dashboard aggregates from shipments; temporary create-intake for E2E.

**Temporary create PO:** Retain a way to create an intake (or a “test” PO) in the application for end-to-end testing, as requested.
