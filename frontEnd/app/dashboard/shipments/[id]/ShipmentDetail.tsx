"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  getShipmentDetail,
  getShipmentTimeline,
  getShipmentStatusSummary,
  updateShipmentStatus,
  updateShipment,
  couplePo,
  decouplePo,
} from "@/services/shipments-service";
import { getPoDetail } from "@/services/po-service";
import { Card } from "@/components/cards";
import { Badge } from "@/components/badges";
import { Timeline } from "@/components/timeline";
import { PageHeader } from "@/components/navigation";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from "@/components/tables";
import { Button } from "@/components/forms";
import { statusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { isApiError } from "@/types/api";
import type { ShipmentDetail as ShipmentDetailType, ShipmentTimelineEntry } from "@/types/shipments";
import type { PoDetail } from "@/types/po";
import styles from "./ShipmentDetail.module.css";

const SHIPMENT_STATUSES = [
  "INITIATE_SHIPPING_DOCUMENT",
  "BIDDING_TRANSPORTER",
  "TRANSPORT_CONFIRMED",
  "READY_PICKUP",
  "PICKED_UP",
  "ON_SHIPMENT",
  "CUSTOMS_CLEARANCE",
  "DELIVERED",
];

export function ShipmentDetail({ id }: { id: string }) {
  const { accessToken } = useAuth();
  const [detail, setDetail] = useState<ShipmentDetailType | null>(null);
  const [timeline, setTimeline] = useState<ShipmentTimelineEntry[]>([]);
  const [statusSummary, setStatusSummary] = useState<{ current_status: string; last_updated_at?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [coupleModal, setCoupleModal] = useState(false);
  const [coupleIntakeIds, setCoupleIntakeIds] = useState("");
  const [coupling, setCoupling] = useState(false);
  const [decouplingId, setDecouplingId] = useState<string | null>(null);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editPibType, setEditPibType] = useState("");
  const [editNoRequestPib, setEditNoRequestPib] = useState("");
  const [editNopen, setEditNopen] = useState("");
  const [editNopenDate, setEditNopenDate] = useState("");
  const [editShipBy, setEditShipBy] = useState("");
  const [editBlAwb, setEditBlAwb] = useState("");
  const [editInsuranceNo, setEditInsuranceNo] = useState("");
  const [editCoo, setEditCoo] = useState("");
  const [editIncotermAmount, setEditIncotermAmount] = useState("");
  const [editBm, setEditBm] = useState("");
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [poDetailsCache, setPoDetailsCache] = useState<Record<string, PoDetail>>({});
  const [loadingPoId, setLoadingPoId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getShipmentDetail(id, accessToken),
      getShipmentTimeline(id, accessToken),
      getShipmentStatusSummary(id, accessToken),
    ])
      .then(([detailRes, timelineRes, summaryRes]) => {
        if (isApiError(detailRes)) {
          setError(detailRes.message);
          return;
        }
        setDetail(detailRes.data ?? null);
        if (!isApiError(timelineRes)) setTimeline(timelineRes.data ?? []);
        if (!isApiError(summaryRes)) setStatusSummary(summaryRes.data ?? null);
      })
      .catch(() => setError("Failed to load shipment"))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !id || !newStatus.trim()) return;
    setActionError(null);
    setUpdatingStatus(true);
    updateShipmentStatus(id, newStatus.trim(), remarks.trim() || undefined, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        setNewStatus("");
        setRemarks("");
        load();
      })
      .finally(() => setUpdatingStatus(false));
  }

  function handleCouplePo(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !id) return;
    const ids = coupleIntakeIds
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      setActionError("Enter at least one intake ID");
      return;
    }
    setActionError(null);
    setCoupling(true);
    couplePo(id, ids, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        setCoupleModal(false);
        setCoupleIntakeIds("");
        load();
      })
      .finally(() => setCoupling(false));
  }

  function handleDecouple(intakeId: string) {
    if (!accessToken || !id) return;
    setActionError(null);
    setDecouplingId(intakeId);
    decouplePo(id, intakeId, undefined, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        load();
      })
      .finally(() => setDecouplingId(null));
  }

  function openEditDetails() {
    if (!detail) return;
    setEditPibType(detail.pib_type ?? "");
    setEditNoRequestPib(detail.no_request_pib ?? "");
    setEditNopen(detail.nopen ?? "");
    setEditNopenDate(detail.nopen_date ?? "");
    setEditShipBy(detail.ship_by ?? "");
    setEditBlAwb(detail.bl_awb ?? "");
    setEditInsuranceNo(detail.insurance_no ?? "");
    setEditCoo(detail.coo ?? "");
    setEditIncotermAmount(detail.incoterm_amount != null ? String(detail.incoterm_amount) : "");
    setEditBm(detail.bm != null ? String(detail.bm) : "");
    setEditDetailsOpen(true);
    setActionError(null);
  }

  function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !id) return;
    setActionError(null);
    setSavingDetails(true);
    const payload = {
      pib_type: editPibType.trim() || undefined,
      no_request_pib: editNoRequestPib.trim() || undefined,
      nopen: editNopen.trim() || undefined,
      nopen_date: editNopenDate.trim() || undefined,
      ship_by: editShipBy.trim() || undefined,
      bl_awb: editBlAwb.trim() || undefined,
      insurance_no: editInsuranceNo.trim() || undefined,
      coo: editCoo.trim() || undefined,
      incoterm_amount: editIncotermAmount.trim() ? Number(editIncotermAmount) : undefined,
      bm: editBm.trim() ? Number(editBm) : undefined,
    };
    updateShipment(id, payload, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        setDetail(res.data ?? null);
        setEditDetailsOpen(false);
        load();
      })
      .finally(() => setSavingDetails(false));
  }

  function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return value;
    }
  }

  function formatDateOnly(value: string | null | undefined): string {
    if (!value) return "—";
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toLocaleDateString();
    } catch {
      return value;
    }
  }

  function display(value: string | null | undefined): string {
    return value != null && String(value).trim() !== "" ? String(value).trim() : "—";
  }

  function togglePoExpand(intakeId: string) {
    if (expandedPoId === intakeId) {
      setExpandedPoId(null);
      return;
    }
    setExpandedPoId(intakeId);
    if (!poDetailsCache[intakeId] && accessToken) {
      setLoadingPoId(intakeId);
      getPoDetail(intakeId, accessToken)
        .then((res) => {
          if (!isApiError(res) && res.data) {
            setPoDetailsCache((prev) => ({ ...prev, [intakeId]: res.data as PoDetail }));
          }
        })
        .finally(() => setLoadingPoId(null));
    }
  }

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!detail) return null;

  return (
    <section className={styles.section}>
      <PageHeader
        title={detail.shipment_number}
        subtitle={detail.vendor_name ?? undefined}
        backHref="/dashboard/shipments"
        backLabel="Shipments"
      />

      {actionError && <p className={styles.error}>{actionError}</p>}

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Shipment details</h2>

        <h3 className={styles.subsectionTitle}>Identification &amp; status</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Shipment number</span>
            <span className={styles.fieldValue}>{detail.shipment_number}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Status</span>
            <Badge variant={statusToBadgeVariant(detail.current_status)}>
              {formatStatusLabel(detail.current_status)}
            </Badge>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Created at</span>
            <span className={styles.fieldValue}>{formatDate(detail.created_at)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Updated at</span>
            <span className={styles.fieldValue}>{formatDate(detail.updated_at)}</span>
          </div>
          {detail.closed_at && (
            <>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Closed at</span>
                <span className={styles.fieldValue}>{formatDate(detail.closed_at)}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Close reason</span>
                <span className={styles.fieldValue}>{display(detail.close_reason)}</span>
              </div>
            </>
          )}
        </div>

        <h3 className={styles.subsectionTitle}>Vendor &amp; partners</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Vendor / supplier</span>
            <span className={styles.fieldValue}>{display(detail.vendor_name)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Forwarder code</span>
            <span className={styles.fieldValue}>{display(detail.forwarder_code)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Forwarder / liner</span>
            <span className={styles.fieldValue}>{display(detail.forwarder_name)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Warehouse / delivery to site</span>
            <span className={styles.fieldValue}>{display(detail.warehouse_name)}</span>
          </div>
        </div>

        <h3 className={styles.subsectionTitle}>Shipment Details</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Incoterm</span>
            <span className={styles.fieldValue}>{display(detail.incoterm)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ship via (Sea / Air)</span>
            <span className={styles.fieldValue}>{display(detail.shipment_method)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ship by</span>
            <span className={styles.fieldValue}>{display(detail.ship_by)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PIB type</span>
            <span className={styles.fieldValue}>{display(detail.pib_type)}</span>
          </div>
          {(detail.pib_type === "PIB 2.3" || detail.pib_type === "PIB 2.0") && (
            <>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>No Request PIB</span>
                <span className={styles.fieldValue}>{display(detail.no_request_pib)}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Nopen</span>
                <span className={styles.fieldValue}>{display(detail.nopen)}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Nopen date</span>
                <span className={styles.fieldValue}>{detail.nopen_date ? formatDateOnly(detail.nopen_date) : "—"}</span>
              </div>
            </>
          )}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>BL/AWB</span>
            <span className={styles.fieldValue}>{display(detail.bl_awb)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Insurance No</span>
            <span className={styles.fieldValue}>{display(detail.insurance_no)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>COO (Certificate of Origin)</span>
            <span className={styles.fieldValue}>{display(detail.coo)}</span>
          </div>
        </div>

        <h3 className={styles.subsectionTitle}>Import duties (service, tax &amp; PDRI)</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Service &amp; charge (incoterm amount)</span>
            <span className={styles.fieldValue}>
              {detail.incoterm_amount != null
                ? Number(detail.incoterm_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                : "—"}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>BM</span>
            <span className={styles.fieldValue}>
              {detail.coo == null
                ? "0"
                : detail.bm != null
                  ? Number(detail.bm).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                  : "0"}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PPN</span>
            <span className={styles.fieldValue}>
              {Number(detail.ppn).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PPH</span>
            <span className={styles.fieldValue}>
              {Number(detail.pph).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PDRI (Pajak Dalam Rangka Impor)</span>
            <span className={styles.fieldValue}>
              {Number(detail.pdri).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {!editDetailsOpen ? (
          <div className={styles.editDetailsActions}>
            <Button type="button" variant="secondary" onClick={openEditDetails}>
              Edit shipment details
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSaveDetails} className={styles.editForm}>
            <h4 className={styles.editFormTitle}>Edit shipment details</h4>
            <div className={styles.editGrid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edit-pib-type">PIB type</label>
                <select
                  id="edit-pib-type"
                  className={styles.input}
                  value={editPibType}
                  onChange={(e) => setEditPibType(e.target.value)}
                >
                  <option value="">— Select —</option>
                  <option value="PIB 2.3">PIB 2.3</option>
                  <option value="PIB 2.0">PIB 2.0</option>
                  <option value="Consignee Note">Consignee Note</option>
                </select>
              </div>
              {(editPibType === "PIB 2.3" || editPibType === "PIB 2.0") && (
                <>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="edit-no-request-pib">No Request PIB</label>
                    <input
                      id="edit-no-request-pib"
                      type="text"
                      className={styles.input}
                      value={editNoRequestPib}
                      onChange={(e) => setEditNoRequestPib(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="edit-nopen">Nopen</label>
                    <input
                      id="edit-nopen"
                      type="text"
                      className={styles.input}
                      value={editNopen}
                      onChange={(e) => setEditNopen(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="edit-nopen-date">Nopen date</label>
                    <input
                      id="edit-nopen-date"
                      type="date"
                      className={styles.input}
                      value={editNopenDate}
                      onChange={(e) => setEditNopenDate(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edit-ship-by">Ship by</label>
                <select
                  id="edit-ship-by"
                  className={styles.input}
                  value={editShipBy}
                  onChange={(e) => setEditShipBy(e.target.value)}
                >
                  <option value="">— Select —</option>
                  <option value="Bulk">Bulk</option>
                  <option value="LCL">LCL</option>
                  <option value="FCL">FCL</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edit-bl-awb">BL/AWB</label>
                <input
                  id="edit-bl-awb"
                  type="text"
                  className={styles.input}
                  value={editBlAwb}
                  onChange={(e) => setEditBlAwb(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edit-insurance-no">Insurance No</label>
                <input
                  id="edit-insurance-no"
                  type="text"
                  className={styles.input}
                  value={editInsuranceNo}
                  onChange={(e) => setEditInsuranceNo(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edit-coo">COO (Certificate of Origin)</label>
                <input
                  id="edit-coo"
                  type="text"
                  className={styles.input}
                  value={editCoo}
                  onChange={(e) => setEditCoo(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edit-incoterm-amount">Service &amp; charge (incoterm amount)</label>
                <input
                  id="edit-incoterm-amount"
                  type="number"
                  min={0}
                  step="any"
                  className={styles.input}
                  value={editIncotermAmount}
                  onChange={(e) => setEditIncotermAmount(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edit-bm">BM (Bea Masuk)</label>
                <input
                  id="edit-bm"
                  type="number"
                  min={0}
                  step="any"
                  className={styles.input}
                  value={editBm}
                  onChange={(e) => setEditBm(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <Button type="submit" variant="primary" disabled={savingDetails}>
                {savingDetails ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditDetailsOpen(false)}
                disabled={savingDetails}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <h3 className={styles.subsectionTitle}>Origin port (port of loading)</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Origin port code</span>
            <span className={styles.fieldValue}>{display(detail.origin_port_code)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Origin port name</span>
            <span className={styles.fieldValue}>{display(detail.origin_port_name)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Origin port country</span>
            <span className={styles.fieldValue}>{display(detail.origin_port_country)}</span>
          </div>
        </div>

        <h3 className={styles.subsectionTitle}>Destination port (port of discharge)</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Destination port code</span>
            <span className={styles.fieldValue}>{display(detail.destination_port_code)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Destination port name</span>
            <span className={styles.fieldValue}>{display(detail.destination_port_name)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Destination port country</span>
            <span className={styles.fieldValue}>{display(detail.destination_port_country)}</span>
          </div>
        </div>

        <h3 className={styles.subsectionTitle}>Dates</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>ETD (estimated departure)</span>
            <span className={styles.fieldValue}>{detail.etd ? formatDate(detail.etd) : "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>ETA (estimated arrival)</span>
            <span className={styles.fieldValue}>{detail.eta ? formatDateOnly(detail.eta) : "—"}</span>
          </div>
        </div>

        {detail.remarks && (
          <>
            <h3 className={styles.subsectionTitle}>Remarks</h3>
            <p className={styles.remarks}>{detail.remarks}</p>
          </>
        )}
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Linked PO</h2>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => setCoupleModal(true)}>
            Couple PO
          </Button>
        </div>
        {detail.linked_pos.length === 0 ? (
          <p className={styles.placeholder}>No PO linked. Use &quot;Couple PO&quot; to add.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className={styles.poExpandCol} aria-label="Expand" />
                <TableHeaderCell>PO number</TableHeaderCell>
                <TableHeaderCell>Plant</TableHeaderCell>
                <TableHeaderCell>Supplier</TableHeaderCell>
                <TableHeaderCell>Incoterms</TableHeaderCell>
                <TableHeaderCell>Coupled at</TableHeaderCell>
                <TableHeaderCell>Coupled by</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.linked_pos.map((po) => {
                const isExpanded = expandedPoId === po.intake_id;
                const poDetail = poDetailsCache[po.intake_id];
                const isLoading = loadingPoId === po.intake_id;
                const items = poDetail?.items ?? [];
                const totalAmount = items.reduce((sum, it) => {
                  const val = it.value != null ? Number(it.value) : (Number(it.qty) || 0) * (Number(it.kurs) || 0);
                  return sum + (Number.isNaN(val) ? 0 : val);
                }, 0);
                return (
                  <Fragment key={po.intake_id}>
                    <TableRow>
                      <TableCell className={styles.poExpandCol}>
                        <button
                          type="button"
                          className={styles.poExpandBtn}
                          onClick={() => togglePoExpand(po.intake_id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Collapse PO details" : "Expand PO details"}
                        >
                          <span className={styles.poExpandIcon} data-expanded={isExpanded}>
                            ▶
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/po/${po.intake_id}`} className={styles.poLink}>
                          {po.po_number}
                        </Link>
                      </TableCell>
                      <TableCell>{po.plant ?? "—"}</TableCell>
                      <TableCell>{po.supplier_name}</TableCell>
                      <TableCell>{po.incoterm_location ?? "—"}</TableCell>
                      <TableCell>{new Date(po.coupled_at).toLocaleString()}</TableCell>
                      <TableCell>{po.coupled_by}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className={styles.decoupleBtn}
                          onClick={() => handleDecouple(po.intake_id)}
                          disabled={decouplingId === po.intake_id}
                        >
                          {decouplingId === po.intake_id ? "Decoupling…" : "Decouple"}
                        </button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${po.intake_id}-detail`}>
                        <TableCell colSpan={8} className={styles.poDetailCell}>
                          {isLoading ? (
                            <p className={styles.poDetailLoading}>Loading PO details…</p>
                          ) : (
                            <div className={styles.poDetailContent}>
                              <div className={styles.poDetailRow}>
                                <span className={styles.poDetailLabel}>Invoice No</span>
                                <span className={styles.poDetailValue}>—</span>
                              </div>
                              {items.length === 0 ? (
                                <p className={styles.poDetailEmpty}>No items</p>
                              ) : (
                                <>
                                  <Table className={styles.poItemsTable}>
                                    <TableHead>
                                      <TableRow>
                                        <TableHeaderCell>Items</TableHeaderCell>
                                        <TableHeaderCell>Qty</TableHeaderCell>
                                        <TableHeaderCell>Unit</TableHeaderCell>
                                        <TableHeaderCell>Value</TableHeaderCell>
                                        <TableHeaderCell>Amount</TableHeaderCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {items.map((item) => {
                                        const amount =
                                          item.value != null
                                            ? Number(item.value)
                                            : (Number(item.qty) || 0) * (Number(item.kurs) || 0);
                                        const amountStr = Number.isNaN(amount)
                                          ? "—"
                                          : amount.toLocaleString(undefined, {
                                              minimumFractionDigits: 0,
                                              maximumFractionDigits: 2,
                                            });
                                        return (
                                          <TableRow key={item.id}>
                                            <TableCell>{display(item.item_description)}</TableCell>
                                            <TableCell>{item.qty != null ? String(item.qty) : "—"}</TableCell>
                                            <TableCell>{display(item.unit)}</TableCell>
                                            <TableCell>
                                              {item.value != null ? String(item.value) : "—"}
                                            </TableCell>
                                            <TableCell>{amountStr}</TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                  <div className={styles.poDetailTotal}>
                                    <span className={styles.poDetailTotalLabel}>Total amount</span>
                                    <span className={styles.poDetailTotalValue}>
                                      {totalAmount.toLocaleString(undefined, {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Update status</h2>
        <form onSubmit={handleUpdateStatus}>
          <div className={styles.statusRow}>
            <label htmlFor="shipment-status-select">
              <span className={styles.fieldLabel}>New status</span>
            </label>
            <select
              id="shipment-status-select"
              className={styles.statusSelect}
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="">Select…</option>
              {SHIPMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.statusRow}>
            <label>
              <span className={styles.fieldLabel}>Remarks (optional)</span>
              <input
                type="text"
                className={styles.input}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks"
              />
            </label>
          </div>
          <Button type="submit" variant="primary" disabled={updatingStatus || !newStatus.trim()}>
            {updatingStatus ? "Updating…" : "Update status"}
          </Button>
        </form>
        {statusSummary?.last_updated_at && (
          <p className={styles.fieldLabel} style={{ marginTop: 8 }}>
            Last updated: {new Date(statusSummary.last_updated_at).toLocaleString()}
          </p>
        )}
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Shipment status timeline</h2>
        <Timeline items={timeline} />
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Documents</h2>
        <p className={styles.placeholder}>Document upload for shipments — coming soon.</p>
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Notes</h2>
        <p className={styles.placeholder}>Notes for shipments — coming soon.</p>
      </Card>

      {coupleModal && (
        <div className={styles.modalOverlay} onClick={() => setCoupleModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Couple PO to shipment</h3>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Intake ID(s), comma or space separated</span>
              <input
                type="text"
                className={styles.input}
                value={coupleIntakeIds}
                onChange={(e) => setCoupleIntakeIds(e.target.value)}
                placeholder="Paste intake UUID(s)"
              />
            </label>
            <div className={styles.modalActions}>
              <Button
                type="button"
                variant="primary"
                onClick={handleCouplePo}
                disabled={coupling || !coupleIntakeIds.trim()}
              >
                {coupling ? "Coupling…" : "Couple"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCoupleModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
