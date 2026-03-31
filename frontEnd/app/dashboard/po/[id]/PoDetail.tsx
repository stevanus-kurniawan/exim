"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  getPoDetail,
  takeOwnership,
  createShipmentFromPo,
  couplePoToShipment,
} from "@/services/po-service";
import { Card } from "@/components/cards";
import { LoadingSkeleton } from "@/components/feedback";
import { Badge } from "@/components/badges";
import { Modal } from "@/components/overlays";
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
import { useToast } from "@/components/providers/ToastProvider";
import { intakeStatusToBadgeVariant, statusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { formatPoStatusLabel } from "@/lib/po-status-label";
import { formatDecimal } from "@/lib/format-number";
import { formatPoLineQtyDisplay } from "@/lib/po-line-qty";
import { formatDateTime, formatDayMonthYear } from "@/lib/format-date";
import { formatYesNoOrLegacy } from "@/lib/yes-no-field";
import { can } from "@/lib/permissions";
import { isApiError } from "@/types/api";
import type { PoDetail as PoDetailType } from "@/types/po";
import { listShipments } from "@/services/shipments-service";
import type { ShipmentListItem } from "@/types/shipments";
import styles from "./PoDetail.module.css";

function normalizeGroupField(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function lineTotalAmount(qty: number | null | undefined, valuePerUnit: number | null | undefined): number | null {
  if (qty == null || valuePerUnit == null) return null;
  const n = qty * valuePerUnit;
  return Number.isFinite(n) ? n : null;
}

export function PoDetail({ id }: { id: string }) {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [detail, setDetail] = useState<PoDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [taking, setTaking] = useState(false);
  const [coupleModal, setCoupleModal] = useState(false);
  const [coupleShipmentId, setCoupleShipmentId] = useState("");
  const [coupling, setCoupling] = useState(false);
  const [coupleShipmentsList, setCoupleShipmentsList] = useState<ShipmentListItem[]>([]);
  const [coupleShipmentsLoading, setCoupleShipmentsLoading] = useState(false);
  const [coupleShipmentsError, setCoupleShipmentsError] = useState<string | null>(null);
  const [expandedLinkedShipmentIds, setExpandedLinkedShipmentIds] = useState<Set<string>>(() => new Set());
  const { pushToast } = useToast();

  function toggleLinkedShipmentLines(shipmentId: string) {
    setExpandedLinkedShipmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(shipmentId)) next.delete(shipmentId);
      else next.add(shipmentId);
      return next;
    });
  }

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    getPoDetail(id, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setError(res.message);
          return;
        }
        setDetail(res.data ?? null);
      })
      .catch(() => setError("Failed to load Purchase Order"))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!coupleModal || !accessToken) return;
    let cancelled = false;
    setCoupleShipmentsLoading(true);
    setCoupleShipmentsError(null);
    listShipments({ limit: 100 }, accessToken)
      .then((res) => {
        if (cancelled) return;
        if (isApiError(res)) {
          setCoupleShipmentsError(res.message);
          setCoupleShipmentsList([]);
          return;
        }
        setCoupleShipmentsList(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setCoupleShipmentsError("Failed to load shipments");
          setCoupleShipmentsList([]);
        }
      })
      .finally(() => {
        if (!cancelled) setCoupleShipmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleModal, accessToken]);

  const eligibleCoupleShipments = useMemo(() => {
    if (!detail) return [];
    const linkedIds = new Set((detail.linked_shipments ?? []).map((s) => s.shipment_id));
    const poInco = normalizeGroupField(detail.incoterm_location);
    const poCur = normalizeGroupField(detail.currency);
    return coupleShipmentsList.filter((s) => {
      if (s.closed_at) return false;
      if (linkedIds.has(s.id)) return false;
      if (normalizeGroupField(s.incoterm) !== poInco) return false;
      const firstCur = normalizeGroupField(s.linked_pos[0]?.currency);
      if (!s.linked_pos.length || firstCur !== poCur) return false;
      for (const lp of s.linked_pos) {
        if (normalizeGroupField(lp.currency) !== poCur) return false;
      }
      return true;
    });
  }, [detail, coupleShipmentsList]);

  function handleTakeOwnership() {
    if (!accessToken || !id) return;
    if (!can(user, "TAKE_OWNERSHIP") || !can(user, "CREATE_SHIPMENT")) return;
    setActionError(null);
    setTaking(true);
    takeOwnership(id, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          pushToast(res.message, "error");
          return null;
        }
        if (res.data) setDetail(res.data);
        pushToast("Purchase Order claimed.", "success");
        return createShipmentFromPo(id, accessToken);
      })
      .then((shipRes) => {
        if (!shipRes) return;
        if (isApiError(shipRes)) {
          setActionError(shipRes.message);
          pushToast(shipRes.message, "error");
          return;
        }
        const data = shipRes.data as { shipment_id?: string };
        if (data?.shipment_id) {
          pushToast("Shipment created from Purchase Order.", "success");
          router.push(`/dashboard/shipments/${data.shipment_id}`);
        } else {
          pushToast("Shipment created.", "success");
          load();
        }
      })
      .finally(() => setTaking(false));
  }

  function handleCoupleToShipment() {
    if (!accessToken || !id || !coupleShipmentId.trim()) return;
    if (!can(user, "COUPLE_DECOUPLE_PO")) return;
    setActionError(null);
    setCoupling(true);
    couplePoToShipment(id, coupleShipmentId.trim(), accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          pushToast(res.message, "error");
          return;
        }
        setCoupleModal(false);
        setCoupleShipmentId("");
        pushToast("Purchase Order coupled to shipment.", "success");
        load();
      })
      .finally(() => setCoupling(false));
  }

  if (loading) return <LoadingSkeleton lines={6} className={styles.loading} />;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!detail) return null;

  const linkedShipments = detail.linked_shipments ?? [];
  const allShipmentsDelivered =
    linkedShipments.length > 0 &&
    linkedShipments.every((s) => s.current_status === "DELIVERED");
  const hasRemainingQty = (detail.items ?? []).some(
    (i) => (i.remaining_qty ?? 0) > 0
  );
  const st = detail.intake_status;
  const canTakeAgain = allShipmentsDelivered && hasRemainingQty;
  const canTake = st === "NEW_PO_DETECTED" || canTakeAgain;
  /** Create / couple from PO page without requiring claim first (grouping can start while status is NEW_PO_DETECTED). */
  const canCreateOrCouple = st !== "FULFILLED";
  /** Matches POST /po/:id/take then POST /po/:id/create-shipment (both permissions required for current flow). */
  const canClaimAndCreateShipment =
    can(user, "TAKE_OWNERSHIP") && can(user, "CREATE_SHIPMENT");
  const canCoupleToShipment = can(user, "COUPLE_DECOUPLE_PO");

  /** Same field as Create PO / API `currency` (e.g. USD, IDR) — not the per-line rate. */
  const poCurrency = detail.currency?.trim() || null;

  return (
    <section className={styles.section}>
      <PageHeader
        title={detail.po_number}
        subtitle={detail.supplier_name}
        backHref="/dashboard/po"
        backLabel="Purchase Order"
        sticky
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase Order", href: "/dashboard/po" },
          { label: detail.po_number },
        ]}
      />

      {actionError && <p className={styles.error}>{actionError}</p>}

      <Card className={styles.cardSpacing}>
        <h2 className={styles.sectionTitle}>General information</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PO number</span>
            <span className={styles.fieldValue}>{detail.po_number}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PT</span>
            <span className={styles.fieldValue}>{detail.pt ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Plant</span>
            <span className={styles.fieldValue}>{detail.plant ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Supplier</span>
            <span className={styles.fieldValue}>{detail.supplier_name}</span>
          </div>
          <div className={`${styles.field} ${styles.fieldAddressFull}`}>
            <span className={styles.fieldLabel}>Delivery location</span>
            <span className={`${styles.fieldValue} ${styles.fieldValueMultiline}`}>
              {detail.delivery_location?.trim() ? detail.delivery_location : "—"}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Incoterms</span>
            <span className={styles.fieldValue}>{detail.incoterm_location ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Kawasan berikat</span>
            <span className={styles.fieldValue}>{formatYesNoOrLegacy(detail.kawasan_berikat)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Currency</span>
            <span className={styles.fieldValue}>{poCurrency ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>PO status</span>
            <span className={styles.fieldValue}>
              <Badge variant={intakeStatusToBadgeVariant(detail.intake_status)}>
                {formatPoStatusLabel(detail.intake_status)}
              </Badge>
              {st === "FULFILLED" && detail.overshipped && (
                <Badge variant="warning" className={styles.overshipBadge}>
                  Over-shipped
                </Badge>
              )}
            </span>
          </div>
          {detail.taken_by_name && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Claimed by</span>
              <span className={styles.fieldValue}>{detail.taken_by_name}</span>
            </div>
          )}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Detected at</span>
            <span className={styles.fieldValue}>
              {new Date(detail.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          {canTake && canClaimAndCreateShipment && (
            <Button
              type="button"
              variant="primary"
              onClick={handleTakeOwnership}
              disabled={taking}
            >
              {taking ? "Claiming & creating shipment…" : canTakeAgain ? "Claim again" : "Claim"}
            </Button>
          )}
          {canCreateOrCouple && canCoupleToShipment && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCoupleShipmentId("");
                setCoupleModal(true);
              }}
            >
              Couple to shipment
            </Button>
          )}
          {canTakeAgain && (
            <span className={styles.fieldValue}>
              All linked shipments are delivered and there is remaining quantity. Claim again to create or couple
              another shipment.
            </span>
          )}
        </div>
      </Card>

      {detail.items.length > 0 && (
        <Card className={styles.cardSpacing}>
          <h2 className={styles.sectionTitle}>Items</h2>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>#</TableHeaderCell>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>Qty</TableHeaderCell>
                <TableHeaderCell>Remaining qty</TableHeaderCell>
                <TableHeaderCell>Unit</TableHeaderCell>
                <TableHeaderCell>
                  Price per unit{poCurrency ? ` (${poCurrency})` : ""}
                </TableHeaderCell>
                <TableHeaderCell>Total amount</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.items.map((item) => {
                const hasOverReceipt = item.over_received_pct != null && item.over_received_pct > 0;
                const totalAmt = lineTotalAmount(item.qty, item.value);
                return (
                  <TableRow key={item.id} className={hasOverReceipt ? styles.rowOverReceived : undefined}>
                    <TableCell>{item.line_number}</TableCell>
                    <TableCell>{item.item_description ?? "—"}</TableCell>
                    <TableCell>{formatPoLineQtyDisplay(item.qty)}</TableCell>
                    <TableCell>
                      {formatPoLineQtyDisplay(item.remaining_qty)}
                      {hasOverReceipt && item.over_received_pct != null && (
                        <span className={styles.overReceivedBadge} title="Delivered more than PO quantity">
                          +{formatDecimal(item.over_received_pct)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{item.unit ?? "—"}</TableCell>
                    <TableCell>{item.value != null ? formatDecimal(item.value) : "—"}</TableCell>
                    <TableCell>{totalAmt != null ? formatDecimal(totalAmt) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {(detail.linked_shipments ?? []).length > 0 && (
        <Card className={styles.cardSpacing}>
          <h2 className={styles.sectionTitle}>Shipments linked to this Purchase Order</h2>
          <p className={styles.linkedShipmentsHint}>
            Expand a row to see quantity delivered on that shipment, by line.
          </p>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className={styles.expandCol} aria-label="Expand line items" />
                <TableHeaderCell>Shipment</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Taken by</TableHeaderCell>
                <TableHeaderCell>Coupled at</TableHeaderCell>
                <TableHeaderCell>Actual time departure</TableHeaderCell>
                <TableHeaderCell>Actual time arrival</TableHeaderCell>
                <TableHeaderCell>Delivered at</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(detail.linked_shipments ?? []).map((ship) => {
                const expanded = expandedLinkedShipmentIds.has(ship.shipment_id);
                const lines = ship.lines_received ?? [];
                return (
                  <Fragment key={ship.shipment_id}>
                    <TableRow>
                      <TableCell className={styles.expandCol}>
                        <button
                          type="button"
                          className={styles.expandLinesBtn}
                          onClick={() => toggleLinkedShipmentLines(ship.shipment_id)}
                          aria-expanded={expanded}
                          aria-controls={`po-linked-shipment-lines-${ship.shipment_id}`}
                          aria-label={
                            expanded
                              ? `Hide line items for ${ship.shipment_number}`
                              : `Show line items for ${ship.shipment_number}`
                          }
                        >
                          <span className={styles.expandLinesIcon} data-expanded={expanded}>
                            ▶
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/shipments/${ship.shipment_id}`} className={styles.shipmentLink}>
                          {ship.shipment_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusToBadgeVariant(ship.current_status)}>
                          {formatStatusLabel(ship.current_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{ship.coupled_by ?? "—"}</TableCell>
                      <TableCell>{ship.coupled_at ? formatDateTime(ship.coupled_at) : "—"}</TableCell>
                      <TableCell>{formatDayMonthYear(ship.atd)}</TableCell>
                      <TableCell>{formatDayMonthYear(ship.ata)}</TableCell>
                      <TableCell>{formatDayMonthYear(ship.delivered_at)}</TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className={styles.nestedLinesRow}>
                        <TableCell colSpan={8}>
                          <div
                            id={`po-linked-shipment-lines-${ship.shipment_id}`}
                            className={styles.nestedLinesPanel}
                          >
                            {lines.length === 0 ? (
                              <p className={styles.nestedLinesEmpty}>No line quantities recorded for this shipment.</p>
                            ) : (
                              <Table wrapperClassName={styles.nestedLinesTableWrap}>
                                <TableHead>
                                  <TableRow>
                                    <TableHeaderCell>Line</TableHeaderCell>
                                    <TableHeaderCell>Description</TableHeaderCell>
                                    <TableHeaderCell>Qty delivered</TableHeaderCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {lines.map((line) => (
                                    <TableRow key={`${ship.shipment_id}-${line.item_id}`}>
                                      <TableCell>{line.line_number}</TableCell>
                                      <TableCell>{line.item_description ?? "—"}</TableCell>
                                      <TableCell>{formatPoLineQtyDisplay(line.received_qty)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Modal
        open={coupleModal}
        onClose={() => {
          setCoupleModal(false);
          setCoupleShipmentId("");
        }}
        title="Couple to shipment"
        footer={
          <>
            <Button
              type="button"
              variant="primary"
              onClick={handleCoupleToShipment}
              disabled={coupling || !coupleShipmentId.trim()}
            >
              {coupling ? "Coupling…" : "Couple"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCoupleModal(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <p className={styles.coupleModalHint}>
          Shipments below match this PO&apos;s incoterm ({detail.incoterm_location ?? "—"}) and currency (
          {poCurrency ?? "—"}), are not closed, and are not already linked to this PO — same rules as grouping
          on the server.
        </p>
        {coupleShipmentsLoading && <p className={styles.fieldValue}>Loading shipments…</p>}
        {coupleShipmentsError && <p className={styles.error}>{coupleShipmentsError}</p>}
        {!coupleShipmentsLoading && !coupleShipmentsError && eligibleCoupleShipments.length === 0 && (
          <p className={styles.fieldValue}>No matching open shipments found. Use the shipment ID field below or create a shipment via Claim.</p>
        )}
        {eligibleCoupleShipments.length > 0 && (
          <ul className={styles.coupleCandidateList} aria-label="Shipments available to couple">
            {eligibleCoupleShipments.map((s) => {
              const poLabels = s.linked_pos.map((p) => p.po_number).join(", ");
              const hasNew = s.linked_pos.some((p) => p.intake_status === "NEW_PO_DETECTED");
              const selected = coupleShipmentId === s.id;
              return (
                <li key={s.id} className={styles.coupleCandidateRow}>
                  <div className={styles.coupleCandidateMain}>
                    <span className={styles.shipmentNumber}>{s.shipment_number}</span>
                    <Badge variant={statusToBadgeVariant(s.current_status)}>{formatStatusLabel(s.current_status)}</Badge>
                    {hasNew && (
                      <Badge variant="neutral" className={styles.coupleNewBadge}>
                        Includes new PO
                      </Badge>
                    )}
                  </div>
                  <div className={styles.coupleCandidatePoLines}>PO on shipment: {poLabels || "—"}</div>
                  <button
                    type="button"
                    className={selected ? styles.couplePickBtnSelected : styles.couplePickBtn}
                    onClick={() => setCoupleShipmentId(s.id)}
                  >
                    {selected ? "Selected" : "Use this shipment"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Shipment ID (UUID) — optional if you pick above</span>
          <input
            type="text"
            className={styles.input}
            value={coupleShipmentId}
            onChange={(e) => setCoupleShipmentId(e.target.value)}
            placeholder="Paste shipment ID"
          />
        </label>
      </Modal>
    </section>
  );
}
