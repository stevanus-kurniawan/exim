"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
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
  updateShipmentPoMapping,
  updateShipmentPoLines,
  listShipmentBids,
  createShipmentBid,
  updateShipmentBid,
  deleteShipmentBid,
  uploadShipmentBidQuotation,
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
import { formatDecimal } from "@/lib/format-number";
import { isApiError } from "@/types/api";
import {
  getMissingRequiredFields,
  getRequiredDocsForTransition,
  getFieldLabel,
  getApplicableStatuses,
  INCOTERMS_WITH_BIDDING_TRANSPORTER,
} from "@/lib/shipment-status-requirements";
import type { TimelineItem as TimelineItemType, TimelineItemVariant } from "@/components/timeline";
import type { ShipmentDetail as ShipmentDetailType, ShipmentTimelineEntry, ShipmentBid, LinkedPoSummary } from "@/types/shipments";
import type { PoDetail } from "@/types/po";
import { config } from "@/lib/config";
import { getCountryOptions } from "@/lib/countries";
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

const ROLES_CAN_EDIT_SHIPMENT = ["exim", "admin"];

export function ShipmentDetail({ id }: { id: string }) {
  const { user, accessToken } = useAuth();
  const canEditShipment = ROLES_CAN_EDIT_SHIPMENT.includes(user?.role?.toLowerCase() ?? "");
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
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [poDetailsCache, setPoDetailsCache] = useState<Record<string, PoDetail>>({});
  const [loadingPoId, setLoadingPoId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [isUpdatingShipment, setIsUpdatingShipment] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editVendorName, setEditVendorName] = useState("");
  const [editForwarderName, setEditForwarderName] = useState("");
  const [editWarehouseName, setEditWarehouseName] = useState("");
  const [editIncoterm, setEditIncoterm] = useState("");
  const [editKawasanBerikat, setEditKawasanBerikat] = useState("");
  const [editShipmentMethod, setEditShipmentMethod] = useState("");
  const [editShipBy, setEditShipBy] = useState("");
  const [editPibType, setEditPibType] = useState("");
  const [editNoRequestPib, setEditNoRequestPib] = useState("");
  const [editNopen, setEditNopen] = useState("");
  const [editNopenDate, setEditNopenDate] = useState("");
  const [editBlAwb, setEditBlAwb] = useState("");
  const [editInsuranceNo, setEditInsuranceNo] = useState("");
  const [editCoo, setEditCoo] = useState("");
  const [editOriginPortName, setEditOriginPortName] = useState("");
  const [editOriginPortCountry, setEditOriginPortCountry] = useState("");
  const [editEtd, setEditEtd] = useState("");
  const [editDestinationPortName, setEditDestinationPortName] = useState("");
  const [editDestinationPortCountry, setEditDestinationPortCountry] = useState("");
  const [editEta, setEditEta] = useState("");
  const [editIncotermAmount, setEditIncotermAmount] = useState("");
  const [editBm, setEditBm] = useState("");
  const [editBmPercentage, setEditBmPercentage] = useState("");
  const [editClosedAt, setEditClosedAt] = useState("");
  const [editCloseReason, setEditCloseReason] = useState("");
  const [bids, setBids] = useState<ShipmentBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [bidForwarder, setBidForwarder] = useState("");
  const [bidServiceAmount, setBidServiceAmount] = useState("");
  const [bidDuration, setBidDuration] = useState("");
  const [bidOriginPort, setBidOriginPort] = useState("");
  const [bidDestinationPort, setBidDestinationPort] = useState("");
  const [bidShipVia, setBidShipVia] = useState("");
  const [addingBid, setAddingBid] = useState(false);
  const [editingBidId, setEditingBidId] = useState<string | null>(null);
  const [editBidForwarder, setEditBidForwarder] = useState("");
  const [editBidServiceAmount, setEditBidServiceAmount] = useState("");
  const [editBidDuration, setEditBidDuration] = useState("");
  const [editBidOriginPort, setEditBidOriginPort] = useState("");
  const [editBidDestinationPort, setEditBidDestinationPort] = useState("");
  const [editBidShipVia, setEditBidShipVia] = useState("");
  const [uploadingQuotationForBidId, setUploadingQuotationForBidId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"details" | "forwarder-bidding">("details");
  const [poEditInvoiceNo, setPoEditInvoiceNo] = useState("");
  const [poEditCurrencyRate, setPoEditCurrencyRate] = useState("");
  const [poEditReceivedQty, setPoEditReceivedQty] = useState<Record<string, string>>({});
  const [savingPoEdit, setSavingPoEdit] = useState(false);

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

  useEffect(() => {
    if (detail) setNotesInput(detail.remarks ?? "");
  }, [detail?.id, detail?.remarks]);

  const hasBiddingStep = useMemo(() => {
    const incoterm = (detail?.incoterm ?? "").trim().toUpperCase();
    return INCOTERMS_WITH_BIDDING_TRANSPORTER.includes(incoterm as (typeof INCOTERMS_WITH_BIDDING_TRANSPORTER)[number]);
  }, [detail?.incoterm]);

  const loadBids = useCallback(() => {
    if (!accessToken || !id || !hasBiddingStep) return;
    setLoadingBids(true);
    listShipmentBids(id, accessToken)
      .then((res) => {
        if (!isApiError(res) && res.data) setBids(res.data);
      })
      .finally(() => setLoadingBids(false));
  }, [accessToken, id, hasBiddingStep]);

  useEffect(() => {
    if (hasBiddingStep && id) loadBids();
    else setBids([]);
  }, [hasBiddingStep, id, loadBids]);

  // When incoterm is no longer EXW/FCA/FOB, switch back to Details tab (Forwarder Bidding only applies to those incoterms)
  useEffect(() => {
    if (!hasBiddingStep && activeDetailTab === "forwarder-bidding") setActiveDetailTab("details");
  }, [hasBiddingStep, activeDetailTab]);

  function handleSaveNotes(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !id) return;
    setActionError(null);
    setSavingNotes(true);
    updateShipment(id, { remarks: notesInput.trim() || undefined }, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        if (res.data) setDetail(res.data);
      })
      .finally(() => setSavingNotes(false));
  }

  function enterUpdateMode() {
    if (!detail) return;
    setEditVendorName(detail.vendor_name ?? "");
    setEditForwarderName(detail.forwarder_name ?? "");
    setEditWarehouseName(detail.warehouse_name ?? "");
    setEditIncoterm(detail.incoterm ?? "");
    setEditKawasanBerikat(detail.kawasan_berikat ?? "");
    setEditShipmentMethod(detail.shipment_method ?? "");
    setEditShipBy(detail.ship_by ?? "");
    setEditPibType(detail.pib_type ?? "");
    setEditNoRequestPib(detail.no_request_pib ?? "");
    setEditNopen(detail.nopen ?? "");
    setEditNopenDate(detail.nopen_date ? detail.nopen_date.slice(0, 10) : "");
    setEditBlAwb(detail.bl_awb ?? "");
    setEditInsuranceNo(detail.insurance_no ?? "");
    setEditCoo(detail.coo ?? "");
    setEditOriginPortName(detail.origin_port_name ?? "");
    setEditOriginPortCountry(detail.origin_port_country ?? "");
    setEditEtd(detail.etd ? detail.etd.slice(0, 10) : "");
    setEditDestinationPortName(detail.destination_port_name ?? "");
    setEditDestinationPortCountry(detail.destination_port_country ?? "");
    setEditEta(detail.eta ? detail.eta.slice(0, 10) : "");
    setEditIncotermAmount(detail.incoterm_amount != null ? String(detail.incoterm_amount) : "");
    setEditBm(detail.bm != null ? String(detail.bm) : "");
    setEditBmPercentage(detail.bm_percentage != null ? String(detail.bm_percentage) : "");
    setEditClosedAt(detail.closed_at ? detail.closed_at.slice(0, 10) : "");
    setEditCloseReason(detail.close_reason ?? "");
    setIsUpdatingShipment(true);
    setActionError(null);
  }

  function cancelUpdateMode() {
    setIsUpdatingShipment(false);
  }

  function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !id) return;
    setActionError(null);
    setSavingDetails(true);
    const payload = {
      vendor_name: editVendorName.trim() || undefined,
      forwarder_name: editForwarderName.trim() || undefined,
      warehouse_name: editWarehouseName.trim() || undefined,
      incoterm: editIncoterm.trim() || undefined,
      kawasan_berikat: editKawasanBerikat.trim() || undefined,
      shipment_method: editShipmentMethod.trim() || undefined,
      ship_by: editShipBy.trim() || undefined,
      pib_type: editPibType.trim() || undefined,
      no_request_pib: editNoRequestPib.trim() || undefined,
      nopen: editNopen.trim() || undefined,
      nopen_date: editNopenDate.trim() || undefined,
      bl_awb: editBlAwb.trim() || undefined,
      insurance_no: editInsuranceNo.trim() || undefined,
      coo: editCoo.trim() || undefined,
      origin_port_name: editOriginPortName.trim() || undefined,
      origin_port_country: editOriginPortCountry.trim() || undefined,
      etd: editEtd.trim() || undefined,
      destination_port_name: editDestinationPortName.trim() || undefined,
      destination_port_country: editDestinationPortCountry.trim() || undefined,
      eta: editEta.trim() || undefined,
      incoterm_amount: editIncotermAmount.trim() ? Number(editIncotermAmount) : undefined,
      bm: editBm.trim() ? Number(editBm) : undefined,
      bm_percentage: editBmPercentage.trim() ? Number(editBmPercentage) : undefined,
      remarks: notesInput.trim() || undefined,
      closed_at: editClosedAt.trim() || undefined,
      close_reason: editCloseReason.trim() || undefined,
    };
    updateShipment(id, payload, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        if (res.data) setDetail(res.data);
        setIsUpdatingShipment(false);
        load();
      })
      .finally(() => setSavingDetails(false));
  }

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

  function handleAddBid(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !id || !bidForwarder.trim()) return;
    setActionError(null);
    setAddingBid(true);
    createShipmentBid(
      id,
      {
        forwarder_name: bidForwarder.trim(),
        service_amount: bidServiceAmount.trim() ? Number(bidServiceAmount) : undefined,
        duration: bidDuration.trim() || undefined,
        origin_port: bidOriginPort.trim() || undefined,
        destination_port: bidDestinationPort.trim() || undefined,
        ship_via: bidShipVia.trim() || undefined,
      },
      accessToken
    )
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        if (res.data) setBids((prev) => [...prev, res.data!]);
        setBidForwarder("");
        setBidServiceAmount("");
        setBidDuration("");
        setBidOriginPort("");
        setBidDestinationPort("");
        setBidShipVia("");
      })
      .finally(() => setAddingBid(false));
  }

  function startEditBid(bid: ShipmentBid) {
    setEditingBidId(bid.id);
    setEditBidForwarder(bid.forwarder_name);
    setEditBidServiceAmount(bid.service_amount != null ? String(bid.service_amount) : "");
    setEditBidDuration(bid.duration ?? "");
    setEditBidOriginPort(bid.origin_port ?? "");
    setEditBidDestinationPort(bid.destination_port ?? "");
    setEditBidShipVia(bid.ship_via ?? "");
  }

  function handleSaveBid(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !id || !editingBidId) return;
    setActionError(null);
    updateShipmentBid(
      id,
      editingBidId,
      {
        forwarder_name: editBidForwarder.trim(),
        service_amount: editBidServiceAmount.trim() ? Number(editBidServiceAmount) : undefined,
        duration: editBidDuration.trim() || undefined,
        origin_port: editBidOriginPort.trim() || undefined,
        destination_port: editBidDestinationPort.trim() || undefined,
        ship_via: editBidShipVia.trim() || undefined,
      },
      accessToken
    )
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        if (res.data) setBids((prev) => prev.map((b) => (b.id === editingBidId ? res.data! : b)));
        setEditingBidId(null);
      });
  }

  function handleDeleteBid(bidId: string) {
    if (!accessToken || !id) return;
    setActionError(null);
    deleteShipmentBid(id, bidId, accessToken).then((res) => {
      if (isApiError(res)) setActionError(res.message);
      else setBids((prev) => prev.filter((b) => b.id !== bidId));
    });
  }

  function handleQuotationUpload(bidId: string, file: File | null) {
    if (!accessToken || !id || !file) return;
    setActionError(null);
    setUploadingQuotationForBidId(bidId);
    uploadShipmentBidQuotation(id, bidId, file, accessToken)
      .then((res) => {
        if (isApiError(res)) setActionError(res.message);
        else if (res.data) setBids((prev) => prev.map((b) => (b.id === bidId ? res.data! : b)));
      })
      .finally(() => setUploadingQuotationForBidId(null));
  }

  function handleQuotationDownload(bid: ShipmentBid) {
    if (!bid.quotation_storage_key || !accessToken) return;
    const base = config.apiBaseUrl.replace(/\/$/, "");
    const url = `${base}/shipments/${id}/bids/${bid.id}/quotation`;
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = bid.quotation_file_name || "quotation";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setActionError("Failed to download quotation"));
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

  const applicableStatuses = useMemo(
    () => getApplicableStatuses(detail?.incoterm),
    [detail?.incoterm]
  );

  const steppedTimeline = useMemo((): TimelineItemType[] => {
    const current = detail?.current_status ?? "";
    const byStatus = new Map<string, ShipmentTimelineEntry>();
    timeline.forEach((e) => byStatus.set(e.status, e));
    return applicableStatuses.map((status, index) => {
      const entry = byStatus.get(status);
      let variant: TimelineItemVariant = "pending";
      if (entry) variant = current === status ? "active" : "complete";
      return {
        sequence: index + 1,
        status,
        changed_at: entry?.changed_at ?? "",
        changed_by: entry?.changed_by ?? "",
        remarks: entry?.remarks ?? null,
        variant,
      };
    });
  }, [detail?.current_status, timeline, applicableStatuses]);

  const missingForStatusUpdate = useMemo(() => {
    if (!detail || !newStatus.trim()) return [];
    return getMissingRequiredFields(detail.current_status, newStatus.trim(), detail);
  }, [detail, newStatus]);

  const requiredDocsForUpdate = useMemo(() => {
    if (!detail || !newStatus.trim()) return [];
    return getRequiredDocsForTransition(detail.current_status, newStatus.trim(), detail.incoterm);
  }, [detail, newStatus]);

  const canProceedStatusUpdate = newStatus.trim() !== "" && missingForStatusUpdate.length === 0;

  const nextStatusOptions = useMemo(() => {
    const current = detail?.current_status ?? "";
    const applicable = getApplicableStatuses(detail?.incoterm);
    const idx = applicable.indexOf(current);
    if (idx === -1) return [...applicable];
    return applicable.slice(idx + 1);
  }, [detail?.current_status, detail?.incoterm]);

  function getCurrencySymbol(currency: string | null | undefined): string {
    const c = (currency ?? "").trim().toUpperCase();
    if (c === "USD") return "$";
    if (c === "IDR") return "Rp ";
    if (c === "EUR") return "€";
    if (c === "GBP") return "£";
    if (c === "JPY") return "¥";
    return c ? `${c} ` : "";
  }

  const linkedPoByIntake = useMemo(() => {
    const map: Record<string, LinkedPoSummary> = {};
    detail?.linked_pos?.forEach((po) => {
      map[po.intake_id] = po;
    });
    return map;
  }, [detail?.linked_pos]);

  useEffect(() => {
    if (!expandedPoId || !detail) return;
    const po = linkedPoByIntake[expandedPoId];
    if (po) {
      setPoEditInvoiceNo(po.invoice_no ?? "");
      setPoEditCurrencyRate(po.currency_rate != null ? String(po.currency_rate) : "");
      const next: Record<string, string> = {};
      (po.line_received ?? []).forEach((l) => {
        next[l.item_id] = String(l.received_qty);
      });
      const items = poDetailsCache[expandedPoId]?.items ?? [];
      items.forEach((it) => {
        if (!(it.id in next)) next[it.id] = "";
      });
      setPoEditReceivedQty(next);
    }
  }, [expandedPoId, detail?.linked_pos, linkedPoByIntake, poDetailsCache]);

  async function handleSavePoDetails(intakeId: string) {
    if (!accessToken || !id) return;
    setActionError(null);
    setSavingPoEdit(true);
    const po = linkedPoByIntake[intakeId];
    const invoiceNo = poEditInvoiceNo.trim() || undefined;
    const currencyRate = poEditCurrencyRate.trim() ? Number(poEditCurrencyRate) : undefined;
    const items = poDetailsCache[intakeId]?.items ?? [];
    try {
      const mapRes = await updateShipmentPoMapping(id, intakeId, { invoice_no: invoiceNo ?? null, currency_rate: currencyRate ?? null }, accessToken);
      if (isApiError(mapRes)) {
        setActionError(mapRes.message);
        return;
      }
      const lines = items.map((item) => ({
        item_id: item.id,
        received_qty: parseFloat(poEditReceivedQty[item.id] ?? "") || 0,
      }));
      const linesRes = await updateShipmentPoLines(id, intakeId, lines, accessToken);
      if (isApiError(linesRes)) {
        setActionError(linesRes.message);
        return;
      }
      if (linesRes.data) setDetail(linesRes.data);
      else load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingPoEdit(false);
    }
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

  function scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        actions={
          canEditShipment && !isUpdatingShipment ? (
            <Button type="button" variant="secondary" onClick={enterUpdateMode}>
              Update shipment
            </Button>
          ) : undefined
        }
      />

      {actionError && <p className={styles.error}>{actionError}</p>}

      {isUpdatingShipment && (
        <div className={styles.editBar}>
          <Button type="button" variant="primary" onClick={() => handleSaveDetails({ preventDefault: () => {} } as React.FormEvent)} disabled={savingDetails}>
            {savingDetails ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="secondary" onClick={cancelUpdateMode} disabled={savingDetails}>
            Cancel
          </Button>
        </div>
      )}

      <nav className={styles.tabBar} aria-label="Shipment detail tabs">
        <button
          type="button"
          className={activeDetailTab === "details" ? `${styles.tabBtn} ${styles.tabBtnActive}` : styles.tabBtn}
          onClick={() => setActiveDetailTab("details")}
        >
          Details
        </button>
        {hasBiddingStep && (
          <button
            type="button"
            className={activeDetailTab === "forwarder-bidding" ? `${styles.tabBtn} ${styles.tabBtnActive}` : styles.tabBtn}
            onClick={() => setActiveDetailTab("forwarder-bidding")}
          >
            Forwarder Bidding Transporters
          </button>
        )}
      </nav>

      {activeDetailTab === "forwarder-bidding" ? (
        <div className={styles.detailLayout}>
          <div className={styles.detailMain}>
            <Card className={styles.card}>
              <h2 className={styles.categoryTitle}>Forwarder Bidding Transporters</h2>
              <p className={styles.placeholderNote}>This section is shown only when the shipment incoterm is <strong>EXW</strong>, <strong>FCA</strong>, or <strong>FOB</strong> (buyer arranges transport). Forwarders (delivery service companies) participate in the bidding process. Add participants with service amount, duration, ports, and optional quotation.</p>
              <form onSubmit={handleAddBid} className={styles.bidForm}>
                <div className={styles.bidFormGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="bid-forwarder">Forwarder name *</label>
                    <input id="bid-forwarder" type="text" className={styles.input} value={bidForwarder} onChange={(e) => setBidForwarder(e.target.value)} placeholder="Forwarder / delivery company name" required />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="bid-service-amount">Service amount</label>
                    <input id="bid-service-amount" type="number" min={0} step="0.01" className={styles.input} value={bidServiceAmount} onChange={(e) => setBidServiceAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="bid-duration">Duration</label>
                    <input id="bid-duration" type="text" className={styles.input} value={bidDuration} onChange={(e) => setBidDuration(e.target.value)} placeholder="e.g. 5 days" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="bid-origin-port">Origin port</label>
                    <input id="bid-origin-port" type="text" className={styles.input} value={bidOriginPort} onChange={(e) => setBidOriginPort(e.target.value)} placeholder="Port of loading" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="bid-destination-port">Destination port</label>
                    <input id="bid-destination-port" type="text" className={styles.input} value={bidDestinationPort} onChange={(e) => setBidDestinationPort(e.target.value)} placeholder="Port of discharge" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="bid-ship-via">Ship via</label>
                    <select id="bid-ship-via" className={styles.input} value={bidShipVia} onChange={(e) => setBidShipVia(e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Sea">Sea</option>
                      <option value="Air">Air</option>
                    </select>
                  </div>
                </div>
                <div className={styles.bidFormActions}>
                  <Button type="submit" variant="primary" disabled={addingBid || !bidForwarder.trim()}>
                    {addingBid ? "Adding…" : "Add participant"}
                  </Button>
                </div>
              </form>
              {loadingBids ? (
                <p className={styles.placeholder}>Loading bidding participants…</p>
              ) : bids.length === 0 ? (
                <p className={styles.placeholder}>No bidding participants yet. Add one above.</p>
              ) : (
                <div className={styles.bidList}>
                  {bids.map((bid) => (
                    <div key={bid.id} className={styles.bidCard}>
                      {editingBidId === bid.id ? (
                        <form onSubmit={handleSaveBid}>
                          <div className={styles.bidFormGrid}>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Forwarder name</span>
                              <input type="text" className={styles.input} value={editBidForwarder} onChange={(e) => setEditBidForwarder(e.target.value)} required />
                            </div>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Service amount</span>
                              <input type="number" min={0} step="0.01" className={styles.input} value={editBidServiceAmount} onChange={(e) => setEditBidServiceAmount(e.target.value)} />
                            </div>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Duration</span>
                              <input type="text" className={styles.input} value={editBidDuration} onChange={(e) => setEditBidDuration(e.target.value)} />
                            </div>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Origin port</span>
                              <input type="text" className={styles.input} value={editBidOriginPort} onChange={(e) => setEditBidOriginPort(e.target.value)} />
                            </div>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Destination port</span>
                              <input type="text" className={styles.input} value={editBidDestinationPort} onChange={(e) => setEditBidDestinationPort(e.target.value)} />
                            </div>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Ship via</span>
                              <select className={styles.input} value={editBidShipVia} onChange={(e) => setEditBidShipVia(e.target.value)}>
                                <option value="">—</option>
                                <option value="Sea">Sea</option>
                                <option value="Air">Air</option>
                              </select>
                            </div>
                          </div>
                          <div className={styles.bidFormActions}>
                            <Button type="submit" variant="primary">Save</Button>
                            <Button type="button" variant="secondary" onClick={() => setEditingBidId(null)}>Cancel</Button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className={styles.bidCardHeader}>
                            <strong>{bid.forwarder_name}</strong>
                            <div className={styles.bidCardActions}>
                              <Button type="button" variant="secondary" onClick={() => startEditBid(bid)}>Edit</Button>
                              <Button type="button" variant="secondary" onClick={() => handleDeleteBid(bid.id)}>Delete</Button>
                            </div>
                          </div>
                          <div className={styles.bidCardGrid}>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Service amount</span>
                              <span className={styles.fieldValue}>{bid.service_amount != null ? formatDecimal(bid.service_amount) : "—"}</span>
                            </div>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Duration</span>
                              <span className={styles.fieldValue}>{display(bid.duration)}</span>
                            </div>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Origin port</span>
                              <span className={styles.fieldValue}>{display(bid.origin_port)}</span>
                            </div>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Destination port</span>
                              <span className={styles.fieldValue}>{display(bid.destination_port)}</span>
                            </div>
                            <div className={styles.field}>
                              <span className={styles.fieldLabel}>Ship via</span>
                              <span className={styles.fieldValue}>{display(bid.ship_via)}</span>
                            </div>
                          </div>
                          <div className={styles.bidQuotation}>
                            <span className={styles.fieldLabel}>Quotation (optional)</span>
                            {bid.quotation_file_name ? (
                              <span>
                                <button type="button" className={styles.bidLink} onClick={() => handleQuotationDownload(bid)}>{bid.quotation_file_name}</button>
                                <label className={styles.bidUploadLabel}>
                                  Replace: <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQuotationUpload(bid.id, f); e.target.value = ""; }} disabled={uploadingQuotationForBidId === bid.id} />
                                  {uploadingQuotationForBidId === bid.id && " Uploading…"}
                                </label>
                              </span>
                            ) : (
                              <label className={styles.bidUploadLabel}>
                                <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQuotationUpload(bid.id, f); e.target.value = ""; }} disabled={uploadingQuotationForBidId === bid.id} />
                                {uploadingQuotationForBidId === bid.id ? " Uploading…" : "Upload quotation"}
                              </label>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <>
      <nav className={styles.categoryNav} aria-label="Shipment sections">
        <button
          type="button"
          className={styles.categoryNavBtn}
          onClick={() => scrollToSection("section-pre-shipment")}
        >
          Pre Shipment
        </button>
        <button
          type="button"
          className={styles.categoryNavBtn}
          onClick={() => scrollToSection("section-on-shipment")}
        >
          On Shipment
        </button>
        <button
          type="button"
          className={styles.categoryNavBtn}
          onClick={() => scrollToSection("section-arrival-customs")}
        >
          Arrival &amp; Customs Clearance
        </button>
        <button
          type="button"
          className={styles.categoryNavBtn}
          onClick={() => scrollToSection("section-delivered")}
        >
          Delivered
        </button>
      </nav>

      <div className={styles.detailLayout}>
        <div className={styles.detailMain}>
      <Card id="section-pre-shipment" className={`${styles.card} ${styles.sectionScrollTarget}`}>
        <h2 className={styles.categoryTitle}>Pre Shipment</h2>

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
        </div>

        <h3 className={styles.subsectionTitle}>Vendor &amp; partners</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Vendor / supplier</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editVendorName} onChange={(e) => setEditVendorName(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.vendor_name)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Forwarder / liner</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editForwarderName} onChange={(e) => setEditForwarderName(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.forwarder_name)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Delivery address</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editWarehouseName} onChange={(e) => setEditWarehouseName(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.warehouse_name)}</span>
            )}
          </div>
        </div>

        <h3 className={styles.subsectionTitle}>Shipment Details</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Incoterm</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editIncoterm} onChange={(e) => setEditIncoterm(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.incoterm)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Kawasan berikat</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editKawasanBerikat} onChange={(e) => setEditKawasanBerikat(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.kawasan_berikat)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ship via (Sea / Air)</span>
            {isUpdatingShipment ? (
              <select className={styles.input} value={editShipmentMethod} onChange={(e) => setEditShipmentMethod(e.target.value)}>
                <option value="">— Select —</option>
                <option value="Sea">Sea</option>
                <option value="Air">Air</option>
              </select>
            ) : (
              <span className={styles.fieldValue}>{display(detail.shipment_method)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ship by</span>
            {isUpdatingShipment ? (
              <select className={styles.input} value={editShipBy} onChange={(e) => setEditShipBy(e.target.value)}>
                <option value="">— Select —</option>
                <option value="Bulk">Bulk</option>
                <option value="LCL">LCL</option>
                <option value="FCL">FCL</option>
              </select>
            ) : (
              <span className={styles.fieldValue}>{display(detail.ship_by)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PIB type</span>
            {isUpdatingShipment ? (
              <select className={styles.input} value={editPibType} onChange={(e) => setEditPibType(e.target.value)}>
                <option value="">— Select —</option>
                <option value="PIB 2.3">PIB 2.3</option>
                <option value="PIB 2.0">PIB 2.0</option>
                <option value="Consignee Note">Consignee Note</option>
              </select>
            ) : (
              <span className={styles.fieldValue}>{display(detail.pib_type)}</span>
            )}
          </div>
          {(isUpdatingShipment ? (editPibType === "PIB 2.3" || editPibType === "PIB 2.0") : (detail.pib_type === "PIB 2.3" || detail.pib_type === "PIB 2.0")) && (
            <>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>No Request PIB</span>
                {isUpdatingShipment ? (
                  <input type="text" className={styles.input} value={editNoRequestPib} onChange={(e) => setEditNoRequestPib(e.target.value)} />
                ) : (
                  <span className={styles.fieldValue}>{display(detail.no_request_pib)}</span>
                )}
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Nopen</span>
                {isUpdatingShipment ? (
                  <input type="text" className={styles.input} value={editNopen} onChange={(e) => setEditNopen(e.target.value)} />
                ) : (
                  <span className={styles.fieldValue}>{display(detail.nopen)}</span>
                )}
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Nopen date</span>
                {isUpdatingShipment ? (
                  <input type="date" className={styles.input} value={editNopenDate} onChange={(e) => setEditNopenDate(e.target.value)} />
                ) : (
                  <span className={styles.fieldValue}>{detail.nopen_date ? formatDateOnly(detail.nopen_date) : "—"}</span>
                )}
              </div>
            </>
          )}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>BL/AWB</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editBlAwb} onChange={(e) => setEditBlAwb(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.bl_awb)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Insurance No</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editInsuranceNo} onChange={(e) => setEditInsuranceNo(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.insurance_no)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>COO (Certificate of Origin)</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editCoo} onChange={(e) => setEditCoo(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.coo)}</span>
            )}
          </div>
        </div>

        <h3 className={styles.subsectionTitle}>Origin port (port of loading)</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Origin port name</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editOriginPortName} onChange={(e) => setEditOriginPortName(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.origin_port_name)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Origin port country</span>
            {isUpdatingShipment ? (
              <select className={styles.input} value={editOriginPortCountry} onChange={(e) => setEditOriginPortCountry(e.target.value)}>
                <option value="">— Select —</option>
                {getCountryOptions(editOriginPortCountry).filter((c) => c !== "").map((country) => (
                  <option key={country || "blank"} value={country}>{country}</option>
                ))}
              </select>
            ) : (
              <span className={styles.fieldValue}>{display(detail.origin_port_country)}</span>
            )}
          </div>
        </div>

        <h3 className={styles.subsectionTitle}>ETD (estimated departure)</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Departure date</span>
            {isUpdatingShipment ? (
              <input type="date" className={styles.input} value={editEtd} onChange={(e) => setEditEtd(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{detail.etd ? formatDate(detail.etd) : "—"}</span>
            )}
          </div>
        </div>
      </Card>

      <Card id="section-on-shipment" className={`${styles.card} ${styles.sectionScrollTarget}`}>
        <h2 className={styles.categoryTitle}>On Shipment</h2>
        <h3 className={styles.subsectionTitle}>Destination port (port of discharge)</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Destination port name</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editDestinationPortName} onChange={(e) => setEditDestinationPortName(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.destination_port_name)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Destination port country</span>
            {isUpdatingShipment ? (
              <select className={styles.input} value={editDestinationPortCountry} onChange={(e) => setEditDestinationPortCountry(e.target.value)}>
                <option value="">— Select —</option>
                {getCountryOptions(editDestinationPortCountry).filter((c) => c !== "").map((country) => (
                  <option key={country || "blank"} value={country}>{country}</option>
                ))}
              </select>
            ) : (
              <span className={styles.fieldValue}>{display(detail.destination_port_country)}</span>
            )}
          </div>
        </div>
        <h3 className={styles.subsectionTitle}>ETA (estimated arrival)</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Arrival date</span>
            {isUpdatingShipment ? (
              <input type="date" className={styles.input} value={editEta} onChange={(e) => setEditEta(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{detail.eta ? formatDateOnly(detail.eta) : "—"}</span>
            )}
          </div>
        </div>
      </Card>

      <Card id="section-arrival-customs" className={`${styles.card} ${styles.sectionScrollTarget}`}>
        <h2 className={styles.categoryTitle}>Arrival &amp; Customs Clearance</h2>
        <h3 className={styles.subsectionTitle}>Import duties (service, tax &amp; PDRI)</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Service &amp; charge (incoterm amount)</span>
            {isUpdatingShipment ? (
              <input type="number" min={0} step="0.01" className={styles.input} value={editIncotermAmount} onChange={(e) => setEditIncotermAmount(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>
                {formatDecimal(detail.incoterm_amount ?? undefined)}
              </span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>BM</span>
            {isUpdatingShipment ? (
              <input type="number" min={0} step="0.01" className={styles.input} value={editBm} onChange={(e) => setEditBm(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{formatDecimal(detail.bm ?? 0)}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>BM percentage (%)</span>
            {isUpdatingShipment ? (
              <input type="number" min={0} max={100} step="0.01" className={styles.input} value={editBmPercentage} onChange={(e) => setEditBmPercentage(e.target.value)} placeholder="e.g. 7.5" />
            ) : (
              <span className={styles.fieldValue}>{detail.bm_percentage != null ? `${formatDecimal(detail.bm_percentage)}%` : "—"}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PPN</span>
            <span className={styles.fieldValue}>{formatDecimal(detail.ppn)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PPH</span>
            <span className={styles.fieldValue}>{formatDecimal(detail.pph)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PDRI (Pajak Dalam Rangka Impor)</span>
            <span className={styles.fieldValue}>{formatDecimal(detail.pdri)}</span>
          </div>
        </div>

        <h3 className={styles.subsectionTitle}>Linked PO</h3>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => setCoupleModal(true)}>
            Add Purchase Order
          </Button>
        </div>
        {detail.linked_pos.length === 0 ? (
          <p className={styles.placeholder}>No PO linked. Use &quot;Add Purchase Order&quot; to add.</p>
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
                          {decouplingId === po.intake_id ? "Removing…" : "Remove"}
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
                                <input
                                  type="text"
                                  className={styles.input}
                                  value={expandedPoId === po.intake_id ? poEditInvoiceNo : ""}
                                  onChange={(e) => setPoEditInvoiceNo(e.target.value)}
                                  placeholder="Invoice number"
                                />
                              </div>
                              <div className={styles.poDetailRow}>
                                <span className={styles.poDetailLabel}>Currency</span>
                                <span className={styles.poDetailValue}>{display(po.currency ?? poDetail?.currency) || "—"}</span>
                              </div>
                              <div className={styles.poDetailRow}>
                                <span className={styles.poDetailLabel}>Currency rate</span>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.000001"
                                  className={styles.input}
                                  value={expandedPoId === po.intake_id ? poEditCurrencyRate : ""}
                                  onChange={(e) => setPoEditCurrencyRate(e.target.value)}
                                  placeholder="e.g. 15500"
                                />
                              </div>
                              {items.length === 0 ? (
                                <p className={styles.poDetailEmpty}>No items</p>
                              ) : (
                                <>
                                  <Table className={styles.poItemsTable}>
                                    <TableHead>
                                      <TableRow>
                                        <TableHeaderCell>Items</TableHeaderCell>
                                        <TableHeaderCell>PO qty</TableHeaderCell>
                                        <TableHeaderCell>Received (this shipment)</TableHeaderCell>
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
                                        const receivedQty = expandedPoId === po.intake_id ? (poEditReceivedQty[item.id] ?? "") : "";
                                        const currencySymbol = getCurrencySymbol(po.currency ?? poDetail?.currency);
                                        return (
                                          <TableRow key={item.id}>
                                            <TableCell>{display(item.item_description)}</TableCell>
                                            <TableCell>{item.qty != null ? formatDecimal(item.qty) : "—"}</TableCell>
                                            <TableCell>
                                              <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                className={styles.input}
                                                value={receivedQty}
                                                onChange={(e) => setPoEditReceivedQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                placeholder="0"
                                              />
                                            </TableCell>
                                            <TableCell>{display(item.unit)}</TableCell>
                                            <TableCell>
                                              {item.value != null ? formatDecimal(item.value) : "—"}
                                            </TableCell>
                                            <TableCell>
                                              {Number.isNaN(amount) ? "—" : `${currencySymbol}${formatDecimal(amount)}`}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                  <div className={styles.poDetailTotal}>
                                    <span className={styles.poDetailTotalLabel}>Total amount</span>
                                    <span className={styles.poDetailTotalValue}>
                                      {getCurrencySymbol(po.currency ?? poDetail?.currency)}{formatDecimal(totalAmount)}
                                    </span>
                                  </div>
                                  <div className={styles.poDetailRow}>
                                    <Button
                                      type="button"
                                      variant="primary"
                                      disabled={savingPoEdit}
                                      onClick={() => handleSavePoDetails(po.intake_id)}
                                    >
                                      {savingPoEdit ? "Saving…" : "Save"}
                                    </Button>
                                    <span className={styles.poDetailHint}>Total received qty across shipments cannot exceed 105% of PO qty.</span>
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

      <Card id="section-delivered" className={`${styles.card} ${styles.sectionScrollTarget}`}>
        <h2 className={styles.categoryTitle}>Delivered</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Closed at</span>
            {isUpdatingShipment ? (
              <input type="date" className={styles.input} value={editClosedAt} onChange={(e) => setEditClosedAt(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{detail.closed_at ? formatDate(detail.closed_at) : "—"}</span>
            )}
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Close reason</span>
            {isUpdatingShipment ? (
              <input type="text" className={styles.input} value={editCloseReason} onChange={(e) => setEditCloseReason(e.target.value)} />
            ) : (
              <span className={styles.fieldValue}>{display(detail.close_reason)}</span>
            )}
          </div>
        </div>
        {detail.remarks && (
          <>
            <h3 className={styles.subsectionTitle}>Remarks</h3>
            <p className={styles.remarks}>{detail.remarks}</p>
          </>
        )}
      </Card>

        </div>
        <aside className={styles.detailSidebar}>
      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Status timeline</h2>
        <Timeline
          items={steppedTimeline}
          formatDate={(iso) => (iso ? formatDate(iso) : "—")}
        />
        <div className={styles.timelineUpdateSection}>
          <h3 className={styles.timelineUpdateTitle}>Update status</h3>
          <form onSubmit={handleUpdateStatus}>
            <div className={styles.statusRow}>
              <label htmlFor="shipment-status-select" className={styles.field}>
                <span className={styles.fieldLabel}>New status</span>
                <select
                  id="shipment-status-select"
                  className={styles.statusSelect}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="">Select next status…</option>
                  {nextStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {formatStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {newStatus.trim() && missingForStatusUpdate.length > 0 && (
              <div className={styles.missingFieldsBox} role="alert">
                <span className={styles.missingFieldsTitle}>Required before updating:</span>
                <ul className={styles.missingFieldsList}>
                  {missingForStatusUpdate.map((key) => (
                    <li key={key}>{getFieldLabel(key)}</li>
                  ))}
                </ul>
                <p className={styles.missingFieldsHint}>Fill these in the detail cards or via &quot;Update shipment&quot;.</p>
              </div>
            )}
            {newStatus.trim() && requiredDocsForUpdate.length > 0 && (
              <p className={styles.requiredDocsNote}>
                Required documents: {requiredDocsForUpdate.join("; ")}
              </p>
            )}
            <div className={styles.statusRow}>
              <label className={styles.field}>
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
            <div className={styles.statusFormActions}>
              <Button
                type="submit"
                variant="primary"
                disabled={updatingStatus || !canProceedStatusUpdate}
              >
                {updatingStatus ? "Updating…" : "Update status"}
              </Button>
            </div>
          </form>
          {statusSummary?.last_updated_at && (
            <p className={`${styles.fieldLabel} ${styles.statusSummaryMargin}`}>
              Last updated: {new Date(statusSummary.last_updated_at).toLocaleString()}
            </p>
          )}
        </div>
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Documents</h2>
        <p className={styles.placeholder}>Document upload for shipments — coming soon.</p>
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Notes</h2>
        <form onSubmit={handleSaveNotes}>
          <label className={styles.field} htmlFor="shipment-notes">
            <span className={styles.fieldLabel}>Free-form notes</span>
            <textarea
              id="shipment-notes"
              className={styles.notesTextarea}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Add notes about this shipment…"
              rows={5}
            />
          </label>
          <div className={styles.notesActions}>
            <Button type="submit" variant="primary" disabled={savingNotes}>
              {savingNotes ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </form>
      </Card>

        </aside>
      </div>
        </>
      )}

      {coupleModal && (
        <div className={styles.modalOverlay} onClick={() => setCoupleModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add Purchase Order</h3>
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
