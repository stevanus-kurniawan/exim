"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Badge } from "@/components/badges";
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
import { intakeStatusToBadgeVariant, statusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { formatDecimal } from "@/lib/format-number";
import { isApiError } from "@/types/api";
import type { PoDetail as PoDetailType } from "@/types/po";
import styles from "./PoDetail.module.css";

export function PoDetail({ id }: { id: string }) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [detail, setDetail] = useState<PoDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [taking, setTaking] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [coupleModal, setCoupleModal] = useState(false);
  const [coupleShipmentId, setCoupleShipmentId] = useState("");
  const [coupling, setCoupling] = useState(false);

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

  function handleTakeOwnership() {
    if (!accessToken || !id) return;
    setActionError(null);
    setTaking(true);
    takeOwnership(id, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        if (res.data) setDetail(res.data);
      })
      .finally(() => setTaking(false));
  }

  function handleCreateShipment() {
    if (!accessToken || !id) return;
    setActionError(null);
    setCreatingShipment(true);
    createShipmentFromPo(id, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        const data = res.data as { shipment_id?: string };
        if (data?.shipment_id) router.push(`/dashboard/shipments/${data.shipment_id}`);
        else load();
      })
      .finally(() => setCreatingShipment(false));
  }

  function handleCoupleToShipment() {
    if (!accessToken || !id || !coupleShipmentId.trim()) return;
    setActionError(null);
    setCoupling(true);
    couplePoToShipment(id, coupleShipmentId.trim(), accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setActionError(res.message);
          return;
        }
        setCoupleModal(false);
        setCoupleShipmentId("");
        load();
      })
      .finally(() => setCoupling(false));
  }

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!detail) return null;

  const linkedShipments = detail.linked_shipments ?? [];
  const allShipmentsDelivered =
    linkedShipments.length > 0 &&
    linkedShipments.every((s) => s.current_status === "DELIVERED");
  const hasRemainingQty = (detail.items ?? []).some(
    (i) => (i.remaining_qty ?? 0) > 0
  );
  const canTakeAgain =
    detail.intake_status === "GROUPED_TO_SHIPMENT" &&
    allShipmentsDelivered &&
    hasRemainingQty;
  const canTake =
    detail.intake_status === "NEW_PO_DETECTED" ||
    detail.intake_status === "NOTIFIED" ||
    canTakeAgain;
  const canCreateOrCouple =
    detail.intake_status === "TAKEN_BY_EXIM" || detail.intake_status === "NOTIFIED";
  const alreadyGrouped = detail.intake_status === "GROUPED_TO_SHIPMENT";

  const poCurrency =
    detail.items?.length && detail.items[0].kurs != null
      ? formatDecimal(detail.items[0].kurs)
      : null;

  return (
    <section className={styles.section}>
      <PageHeader
        title={detail.po_number}
        subtitle={detail.supplier_name}
        backHref="/dashboard/po"
        backLabel="Purchase Order"
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
            <span className={styles.fieldLabel}>Plant</span>
            <span className={styles.fieldValue}>{detail.plant ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Supplier</span>
            <span className={styles.fieldValue}>{detail.supplier_name}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Delivery location</span>
            <span className={styles.fieldValue}>{detail.delivery_location ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Incoterms</span>
            <span className={styles.fieldValue}>{detail.incoterm_location ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Kawasan berikat</span>
            <span className={styles.fieldValue}>{detail.kawasan_berikat ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Currency</span>
            <span className={styles.fieldValue}>{poCurrency ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Intake status</span>
            <Badge variant={intakeStatusToBadgeVariant(detail.intake_status)}>
              {formatStatusLabel(detail.intake_status)}
            </Badge>
          </div>
          {detail.taken_by_name && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Taken by</span>
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
          {canTake && (
            <Button
              type="button"
              variant="primary"
              onClick={handleTakeOwnership}
              disabled={taking}
            >
              {taking ? "Taking…" : "Take ownership"}
            </Button>
          )}
          {canCreateOrCouple && !alreadyGrouped && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={handleCreateShipment}
                disabled={creatingShipment}
              >
                {creatingShipment ? "Creating…" : "Create shipment"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCoupleModal(true)}
              >
                Couple to shipment
              </Button>
            </>
          )}
          {alreadyGrouped && !canTakeAgain && (
            <span className={styles.fieldValue}>This Purchase Order is grouped to a shipment.</span>
          )}
          {alreadyGrouped && canTakeAgain && (
            <span className={styles.fieldValue}>
              All linked shipments are delivered and there is remaining quantity. You can take ownership again to create or couple another shipment.
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
                <TableHeaderCell>Value</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.items.map((item) => {
                const hasOverReceipt = item.over_received_pct != null && item.over_received_pct > 0;
                return (
                  <TableRow key={item.id} className={hasOverReceipt ? styles.rowOverReceived : undefined}>
                    <TableCell>{item.line_number}</TableCell>
                    <TableCell>{item.item_description ?? "—"}</TableCell>
                    <TableCell>{item.qty != null ? formatDecimal(item.qty) : "—"}</TableCell>
                    <TableCell>
                      {item.remaining_qty != null ? formatDecimal(item.remaining_qty) : "—"}
                      {hasOverReceipt && item.over_received_pct != null && (
                        <span className={styles.overReceivedBadge} title="Received more than PO quantity">
                          +{formatDecimal(item.over_received_pct)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{item.unit ?? "—"}</TableCell>
                    <TableCell>{item.value != null ? formatDecimal(item.value) : "—"}</TableCell>
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
          <p className={styles.shipmentsHint}>
            Deliveries that interact with this PO (one PO can have multiple partial deliveries).
          </p>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Shipment</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Taken by</TableHeaderCell>
                <TableHeaderCell>Coupled at</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(detail.linked_shipments ?? []).map((ship) => (
                <TableRow key={ship.shipment_id}>
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
                  <TableCell>{new Date(ship.coupled_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {coupleModal && (
        <div className={styles.modalOverlay} onClick={() => setCoupleModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Couple to shipment</h3>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Shipment ID (UUID)</span>
              <input
                type="text"
                className={styles.input}
                value={coupleShipmentId}
                onChange={(e) => setCoupleShipmentId(e.target.value)}
                placeholder="Paste shipment ID"
              />
            </label>
            <div className={styles.modalActions}>
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
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
