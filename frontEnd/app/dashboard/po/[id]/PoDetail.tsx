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
import { intakeStatusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
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
      .catch(() => setError("Failed to load PO"))
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

  const canTake = detail.intake_status === "NEW_PO_DETECTED" || detail.intake_status === "NOTIFIED";
  const canCreateOrCouple =
    detail.intake_status === "TAKEN_BY_EXIM" || detail.intake_status === "NOTIFIED";
  const alreadyGrouped = detail.intake_status === "GROUPED_TO_SHIPMENT";

  return (
    <section className={styles.section}>
      <PageHeader
        title={detail.po_number}
        subtitle={detail.supplier_name}
        backHref="/dashboard/po"
        backLabel="PO"
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
            <span className={styles.fieldLabel}>Intake status</span>
            <Badge variant={intakeStatusToBadgeVariant(detail.intake_status)}>
              {formatStatusLabel(detail.intake_status)}
            </Badge>
          </div>
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
          {alreadyGrouped && (
            <span className={styles.fieldValue}>This PO is grouped to a shipment.</span>
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
                <TableHeaderCell>Unit</TableHeaderCell>
                <TableHeaderCell>Value</TableHeaderCell>
                <TableHeaderCell>Kurs</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.line_number}</TableCell>
                  <TableCell>{item.item_description ?? "—"}</TableCell>
                  <TableCell>{item.qty ?? "—"}</TableCell>
                  <TableCell>{item.unit ?? "—"}</TableCell>
                  <TableCell>{item.value != null ? String(item.value) : "—"}</TableCell>
                  <TableCell>{item.kurs ?? "—"}</TableCell>
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
