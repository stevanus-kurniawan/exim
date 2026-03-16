# TSD

Technical Specification
EXIM Operation System (EOS) – Phase 1 Import

Prepared by: Technical Engineering Manager
Input source: Product Requirements Document (11 March 2026)
Proposed stack: Next.js, Node.js, PostgreSQL, Docker Compose

1. Source and Scope

This technical specification is derived from the attached PRD for EXIM Operation System (EOS), which defines a centralized import monitoring platform with import transaction management, shipment monitoring, document management, forwarder bidding, import duty tracking, and shipment status timeline. Phase 1 is limited to import operations, while export operations remain future scope.

Reference: attached PRD document provided by the user.

2. Solution Summary

• A web-based internal system with a Next.js frontend, Node.js backend API, and PostgreSQL relational database.

• Document files stored outside the database in an external file repository; metadata, indexing, and workflow states stored in PostgreSQL.

• Docker Compose deployment separating frontend, backend, database, reverse proxy, and optional worker service.

• A transaction-centric data model that supports one shipment containing multiple POs, milestone tracking, document checklists, and audit history.

3. High-Level Architecture

4. Proposed Repository / Filing Structure

• Assets/ – static assets, icons, templates, sample import files, UI reference images, generated architecture diagrams.

• Frontend/ – Next.js source code, UI components, pages/app router, services, hooks, styles, tests, Dockerfile.

• Backend/ – Node.js API source code, modules, controllers, services, repositories, migrations, background jobs, tests, Dockerfile.

• Docs/ – PRD, technical specification, API contracts, ERD, sequence diagrams, SOP, deployment guide, release notes.

5. Functional Modules

6. Core Data Model

Recommended core tables/entities:

• users, roles, permissions, user_role

• import_transactions

• import_transaction_po_links

• forwarders, bidding_events, bidding_quotes

• shipment_milestones, milestone_history

• document_types, transaction_documents, document_versions

• duty_records, tax_payment_references

• warehouses, goods_receipts

• audit_logs, activity_comments, attachments

7. Shipment Status Timeline Logic

8. API Design (Initial)

9. Document Handling Strategy

Key principle: store document binary files outside PostgreSQL. PostgreSQL should keep metadata, relationships, checksum, version number, uploader, and access log only.

• One transaction may contain up to 10 documents, each up to 10 MB, so a transaction can reach roughly 100 MB of raw file content.

• With 600 transactions per year, annual raw file volume can reach about 60 GB/year (600 × 10 × 10 MB).

• Allow 30–100% overhead for re-uploads, revised versions, previews, antivirus quarantine, and temporary files. Practical planning size becomes 78–120 GB/year.

• If backup retention includes multiple copies, total infrastructure consumption may easily become 2–4× the live storage footprint.

10. Share Folder vs Cloud Storage Comparison

11. Recommendation

• Preferred target architecture: abstract the storage layer in the backend and do not couple the application directly to one storage type.

• Short-term pragmatic option: continue using on-prem share folder if company policy requires on-prem retention and the current infrastructure is reliable, backed up, and accessible from the application server.

• Medium-term preferred option: move to object-style storage (private cloud, company cloud tenancy, or S3-compatible storage) because document-heavy systems benefit from better scalability, durability, and easier lifecycle management.

• If immediate cloud adoption is not possible, use an adapter pattern so EOS can start on share folder now and migrate to object storage later with minimal API changes.

12. Backend Storage Abstraction Design

Create a StorageService interface in the backend:

• Implementation A: SharedFolderStorageProvider using mounted network path or SMB/NFS mount.

• Implementation B: ObjectStorageProvider using cloud bucket or S3-compatible API.

• Application code should depend only on StorageService, not on share folder path conventions.

13. Non-Functional Requirements

14. Security Considerations

• Use HTTPS behind reverse proxy and do not expose PostgreSQL directly outside the Docker network.

• Validate MIME type, extension, and file size during upload; optionally run antivirus scanning before finalizing upload.

• Store files with generated internal names rather than original file names to avoid collisions and unsafe paths.

• Record checksum (for example SHA-256) for integrity checking.

• Use least-privilege access for mounted share folders or cloud credentials.

• Implement audit logs for document upload/download, milestone updates, duty changes, and forwarder award decisions.

15. Docker Compose Deployment Blueprint

• Mount external document storage separately from the container filesystem. Do not store production documents only inside a container writable layer.

• Keep environment variables in protected .env files or secret management, especially DB credentials and storage access keys.

• Plan regular PostgreSQL backups and separate document repository backups.

16. Risks and Mitigations

17. Open Questions for Engineering / Business

• Will EOS require document versioning, or only latest active file per document type?

• Will users need preview in browser for PDF/image documents, or download only?

• Is there a corporate archive/retention policy that mandates on-prem storage duration?

• Is there a target disaster recovery objective (RPO/RTO) for both metadata and document repository?

• Will the application integrate later with ERP for PO import and finance payment references?

18. Implementation Approach

• Phase A: foundation setup (repository structure, Docker Compose, auth, master data, transaction skeleton).

• Phase B: document upload and metadata management with storage abstraction.

• Phase C: bidding, timeline workflow, duty management, dashboard.

• Phase D: hardening (audit logs, alerts, backup validation, performance testing, DR rehearsal).

This document intentionally recommends a storage abstraction approach so the project can begin with the current share folder while keeping a controlled migration path to cloud or object storage later.

Document purpose
Translate the approved PRD into an implementable technical blueprint covering architecture, data design, APIs, document storage strategy, security, deployment, and engineering risks for EOS Phase 1 (Import Operations).



Layer | Main Components | Responsibilities

Client | Browser / Corporate network | User access for EXIM, Purchasing, Finance, Warehouse, Management

Presentation | Next.js application | UI rendering, role-based navigation, form validation, dashboard, timeline view, document upload UI

Application | Node.js API service | Business logic, authentication, authorization, transaction workflow, document metadata, reporting APIs

Data | PostgreSQL | Master data, transactions, milestones, bids, duties, audit logs, document metadata

File Storage | Share folder or object/cloud storage | Store uploaded shipment files and support retrieval/download

Infrastructure | Docker Compose + reverse proxy + volumes | Container orchestration, configuration, persistence, networking, observability



Folder | Examples

Assets | logos/, mock-data/, templates/, diagrams/

Frontend | src/app, src/components, src/lib, public/, tests/

Backend | src/modules, src/common, prisma/ or migrations/, tests/

Docs | prd/, technical-spec/, api/, deployment/, qa/



Module | Description | Primary Roles | Key Data Objects

Authentication & RBAC | Login, session handling, role permissions, audit trail | All users | User, Role, Permission, Session

Import Transaction | Create and manage shipment transactions and linked purchase orders | EXIM | ImportTransaction, POReference, Vendor

Forwarder Bidding | Capture bidding rounds, quotations, selection result | EXIM | Bid, Forwarder, BidAttachment

Document Management | Upload, version, categorize, download, validate required documents | EXIM, Finance, Warehouse | Document, DocumentType, Checklist

Shipment Timeline | Track milestone progression and maintain history | EXIM, Stakeholders | Milestone, MilestoneHistory

Import Duty Monitoring | Record BM, PPN, PPH, PDRI and payment status | Finance, EXIM | DutyRecord, PaymentReference

Dashboard & Reporting | Operational dashboard, filter, export, aging view | Management, EXIM | Aggregated metrics, reports



Entity | Important Fields | Notes

import_transactions | id, transaction_no, status, vendor, incoterm, ship_via, ship_by, ETD, ETA | Parent record for one monitored shipment/import case

import_transaction_po_links | id, transaction_id, po_number, item_desc, qty, unit, value, currency | Allows one shipment to contain multiple POs

shipment_milestones | id, transaction_id, code, status, occurred_at, remarks | Stores current milestone values

milestone_history | id, transaction_id, old_status, new_status, changed_by, changed_at | Supports current and previous status tracking

transaction_documents | id, transaction_id, document_type_id, file_name, storage_path, size_bytes, checksum | Metadata only; file body stays in storage repository

document_versions | id, document_id, version_no, storage_path, uploaded_by | Optional if versioning is enabled

duty_records | id, transaction_id, bm, ppn, pph, pdri_total, payment_status | Tracks import duties and taxes



Order | Status Code | Trigger | System Rule

1 | INIT_SHIPPING_DOC | Transaction created and monitoring started | Set automatically during initial transaction creation

2 | BIDDING_TRANSPORTER | Bidding event opened | Set when at least one bid request is created

3 | TRANSPORT_CONFIRMED | Forwarder awarded | Set when winner is selected

4 | READY_PICKUP | Supplier cargo readiness confirmed | Manual update by EXIM

5 | PICKED_UP | Pickup date entered | Manual date entry required

6 | ON_SHIPMENT | ETD recorded | Current status changes to On Shipment

7 | CUSTOMS_CLEARANCE | PIB submitted / customs process started | Triggered by PIB reference entry

8 | DELIVERY | SPPB issued and delivery initiated | Triggered by customs release

9 | GOODS_RECEIVED | Warehouse confirms receipt | Triggered by goods receipt confirmation

10 | IMPORT_COMPLETED | All operational and document checks complete | Final closure state



Method | Endpoint | Purpose | Notes

POST | /api/auth/login | Authenticate user | JWT or secure session token

GET | /api/import-transactions | List transactions with filters | Filter by status, vendor, ETA, forwarder

POST | /api/import-transactions | Create transaction | Creates base record and first milestone

GET | /api/import-transactions/{id} | Get transaction detail | Includes documents, duties, milestone history

PATCH | /api/import-transactions/{id} | Update transaction data | Restricted by role/state

POST | /api/import-transactions/{id}/documents | Upload document | Multipart upload + metadata validation

POST | /api/import-transactions/{id}/bids | Create/update bidding event | Stores quotations and selected forwarder

POST | /api/import-transactions/{id}/milestones | Update milestone | Writes current status and history

POST | /api/import-transactions/{id}/duties | Create/update duty record | Captures BM, PPN, PPH, PDRI



Recommended file metadata
transaction_id, document_type, original_file_name, stored_file_name, storage_provider, storage_path/key, mime_type, size_bytes, checksum_sha256, version_no, uploaded_by, uploaded_at, is_required, approval_status.



Criteria | On-Prem Share Folder | Cloud/Object Storage | Engineering Comment

Initial cost | Lower if server already exists | Usually pay-as-you-use operational cost | Share folder is cheaper short term if capacity already available

Scalability | Manual capacity expansion | High scalability | Cloud scales better as yearly document volume grows

Availability | Depends on internal server/network | Typically higher durability/availability | Cloud is stronger for multi-site access and disaster scenarios

Backup & DR | Must be designed and operated internally | Usually easier to replicate and back up | Cloud reduces infrastructure burden but still needs backup policy

Performance | Good within local network | Depends on internet connectivity | On-prem may be faster for same-LAN office users

Security control | Full internal control | Shared responsibility model | Both can be secure if IAM, encryption, and audit are enforced

Integration effort | Simple if existing share path is already used | Requires SDK/API integration or mounted gateway | Cloud needs cleaner application design



Engineering recommendation
For EOS, the best balance is metadata in PostgreSQL + storage abstraction in backend + file body in external repository. This supports starting with the current on-prem share folder while keeping migration path open to cloud/object storage.



Method | Purpose

upload(file, path, metadata) | Store a new file and return storage key/path

download(storageKey) | Return stream or signed access

delete(storageKey) | Soft/hard delete according to retention rule

exists(storageKey) | Verify referenced object exists



Area | Target | Notes

Security | Role-based access, encryption in transit, audit log | Restrict document download by role and transaction ownership

Performance | <3 sec for normal list/detail view | Large file upload/download depends on file size and network

File Upload | Support up to 10 MB per file | Reject oversized files with explicit validation message

Reliability | No loss of metadata/file linkage | Use checksum and post-upload validation

Auditability | Track create/update/upload/status changes | Mandatory for operational transparency

Maintainability | Modular service architecture | Separate modules by business capability



Service | Purpose | Persistence

nginx / reverse-proxy | Route traffic, TLS termination, static compression | Config volume

frontend | Next.js app | Build artifact/image only

backend | Node.js API | Config + optional temp upload volume

postgres | Relational database | Persistent DB volume

worker (optional) | Background jobs, file scan, report generation | Image only



Risk | Impact | Likelihood | Mitigation

Document growth underestimated | Disk exhaustion / service disruption | Medium | Capacity planning, storage alerts, yearly forecast review

Share folder unavailable | Cannot open or upload documents | Medium | Mount health check, retry logic, backup path, DR plan

Poor file naming / duplicates | Operational confusion | High | Generated internal file ID + metadata-based display name

Large upload failure | Partial or missing files | Medium | Chunk/retry handling and transactional metadata commit

Missing milestone discipline | Timeline becomes unreliable | Medium | Enforce SOP and role-based mandatory fields

Access leakage | Sensitive shipping document exposure | Low/Medium | RBAC, signed URLs/token checks, audit log monitoring

