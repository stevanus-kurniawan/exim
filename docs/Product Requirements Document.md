# Product Requirements Document

Product Requirements Document (PRD)

Product Name

EXIM Operation System (EOS)

Product Manager: Stevanus Kurniawan
Date: 11 March 26

1. Product Overview

Vision / Goal

To build a centralized EXIM Operation System (EOS) that enables EXIM teams and stakeholders to track, manage, and monitor all import transactions from purchase notification until goods receipt at warehouse.

The system replaces manual spreadsheet tracking and improves operational efficiency by providing:

Real-time shipment monitoring

Centralized document management

Shipment milestone timeline

Import duty tracking

Operational transparency for stakeholders

Phase 1 focuses on Import Operations.
Phase 2 will expand the system to include Export Operations.

Target Users

Primary Users

EXIM Team

Secondary Users

Purchasing Team

Finance Team

Warehouse Team

Management

2. Problem Statement

Currently import operations are tracked manually using spreadsheets and emails. This creates several operational challenges:

1. Limited shipment visibility
Stakeholders cannot easily monitor shipment progress.

2. Document fragmentation
Important shipment documents such as BL, Invoice, COO, and PIB are stored in different locations.

3. Complex shipment structure
A single shipment can contain multiple purchase orders.

4. Lack of shipment milestone monitoring
There is no standardized system to track shipment status.

5. Difficult reporting for management
Management lacks a centralized dashboard to monitor import activities.

A digital system is required to centralize import monitoring and improve operational transparency.

3. Success Metrics

4. Scope

Phase 1 – Import

In Scope

Import transaction management

Shipment monitoring

Document management

Forwarder bidding management

Import duty monitoring

Shipment status timeline

Dashboard and reporting

Out of Scope

Export shipment management

Supplier portal

Customs API integration

Automated financial payment processing

These will be considered in future phases.

5. Business or User Flow

Import Monitoring Workflow

Purchasing informs EXIM about overseas purchase.

EXIM creates Import Transaction in the system.

EXIM reviews PO incoterm.

EXIM conducts forwarder bidding.

Transporter is selected.

Supplier prepares shipment.

Cargo ready for pickup.

Forwarder collects cargo.

Shipment departs origin port.

Customs clearance process begins.

Import duties and taxes are paid.

Customs releases SPPB.

Cargo delivered to warehouse.

Warehouse confirms goods receipt.

Import transaction completed.

6. User Stories

7. Shipment Status Timeline Feature

Purpose

Provide a visual shipment milestone tracker within the Import Transaction Detail page so users can easily monitor shipment progress.

The timeline displays:

Completed milestones

Current shipment status

Upcoming milestones

Date of each milestone

Activity description

Timeline Status Flow

Timeline Visual Logic

Example timeline:

● Initiate Shipping Document
● Bidding Transporter
● Transport Confirmed
● Ready Pickup
● Picked Up

🔴 On Shipment

○ Customs Clearance
○ Delivery
○ Goods Received
○ Import Completed

Timeline Update Behavior

The system updates shipment timeline when milestones are recorded.

8. Import Transaction Data

Basic Information

PO Number

Vendor

Item Description

Qty

Unit

Kurs

Value

Shipment Information

Incoterm

Ship via (Sea / Air)

Ship by (Bulk, LCL, FCL)

Forwarder / Liner

Pickup time

ETD

ETA

Delivery to Site

Customs Information

Nopen

Nopen Date

PIB Type (PIB 2.3 / PIB 2.0 / Consignee Note)

BL/AWB

Invoice Number

COO

Insurance Number

No Pengajuan PIB

Shipment Details

Net Weight

Gross Weight

Country of Origin

Port of Loading

Port of Discharge

Import Duties

BM

PPN

PPH

Total PDRI

9. UX / Design (Optional)

Import Transaction Detail Page Layout

Import Transaction Detail

--------------------------------
General Information
--------------------------------

--------------------------------
Shipment Information
--------------------------------

--------------------------------
Documents
--------------------------------

--------------------------------
Shipment Status Timeline
--------------------------------

--------------------------------
Import Duties & Taxes
--------------------------------

10. Dependencies / Risks

KPI | Target

Shipment tracking coverage | 100% import shipments recorded

Document completeness | 95% shipments have required documents before customs clearance

Operational efficiency | Reduce manual tracking workload by 50%



No | Function/Page | User Story | Acceptance Criteria

1 | Create Import Transaction | As an EXIM officer, I want to create an import transaction so that shipment monitoring can begin | System allows entry of PO and shipment information

2 | Upload Shipment Documents | As an EXIM officer, I want to upload shipment documents so that documents are stored centrally | System supports uploading BL, invoice, COO, insurance, packing list

3 | Forwarder Bidding | As an EXIM officer, I want to record forwarder bidding results so transporter selection is documented | System records bidding data and selected forwarder

4 | Shipment Monitoring | As a stakeholder, I want to monitor shipment progress so I know shipment status | System displays shipment details and progress

5 | Import Duty Monitoring | As finance staff, I want to record import taxes so duties can be monitored | BM, PPN, PPH, and PDRI are recorded

6 | Shipment Status Timeline | As a stakeholder, I want to view the shipment timeline so that I can understand shipment progress clearly | Timeline displays completed, current, and pending statuses



Step | Status | Description

1 | Initiate Shipping Document | EXIM team starts shipment monitoring

2 | Bidding Transporter | EXIM requests quotation from forwarders

3 | Transport Confirmed | Forwarder selected

4 | Ready Pickup | Supplier confirms cargo ready

5 | Picked Up | Cargo collected by forwarder

6 | On Shipment | Cargo departed origin port

7 | Customs Clearance | Import declaration process

8 | Delivery | Cargo delivered to warehouse

9 | Goods Received | Warehouse confirms goods arrival

10 | Import Completed | Import process completed



Indicator | Meaning

Green | Completed status

Red | Current status

Grey | Pending status



Event | Status Update

Forwarder selected | Transport Confirmed

Pickup date entered | Picked Up

ETD recorded | On Shipment

PIB submitted | Customs Clearance

SPPB issued | Delivery

Warehouse confirmation | Goods Received



No | Dependency / Risk | Raised Date | Mitigation | PIC | Status

1 | PO data from ERP | TBD | Manual entry in Phase 1 | IT | Open

2 | Document completeness | TBD | Implement document checklist validation | EXIM | Open

3 | Shipment status updates | TBD | Establish clear operational SOP | EXIM | Open

