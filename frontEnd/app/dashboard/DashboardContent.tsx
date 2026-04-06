"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  getPoDashboardCounts,
  getDeliveredManagementSummary,
  getShipmentDashboardCounts,
} from "@/services/dashboard-service";
import { listShipments } from "@/services/shipments-service";
import { Card, StatsCard } from "@/components/cards";
import { LoadingSkeleton } from "@/components/feedback";
import { PageHeader, EmptyState } from "@/components/navigation";
import { Badge } from "@/components/badges";
import { IconBox, IconClock, IconShip, IconDocument, IconCheck } from "@/components/icons/KpiIcons";
import { statusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { can } from "@/lib/permissions";
import { displayProductClassification } from "@/lib/product-classification";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/tables";
import { isApiError } from "@/types/api";
import type { ShipmentListItem } from "@/types/shipments";
import type { ApiSuccess } from "@/types/api";
import type { DeliveredManagementItem } from "@/types/dashboard";
import styles from "./DashboardContent.module.css";

const RECENT_LIMIT = 5;
const VIEW_SHIPMENTS = "VIEW_SHIPMENTS";

function currentMonth(): number {
  return new Date().getMonth() + 1;
}

function currentYear(): number {
  return new Date().getFullYear();
}

function numberFmt(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
}

function formatIdr(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOptionalIdr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatIdr(value);
}

export function DashboardContent() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const [poCounts, setPoCounts] = useState({ newPoDetected: 0, awaitingAssignment: 0 });
  const [shipmentCounts, setShipmentCounts] = useState({
    activeShipments: 0,
    customsClearance: 0,
    delivered: 0,
  });
  const [recentShipments, setRecentShipments] = useState<ShipmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [specMonth, setSpecMonth] = useState(() => currentMonth());
  const [specYear, setSpecYear] = useState(() => currentYear());
  const [specItems, setSpecItems] = useState<DeliveredManagementItem[]>([]);
  const [specLoading, setSpecLoading] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);

  const specYears = useMemo(() => {
    const now = currentYear();
    const list: number[] = [];
    for (let y = now - 5; y <= now + 1; y++) list.push(y);
    return list;
  }, []);

  const fetchSpecSummary = useCallback(() => {
    if (!accessToken || !can(user, VIEW_SHIPMENTS)) {
      setSpecLoading(false);
      return;
    }
    setSpecLoading(true);
    setSpecError(null);
    getDeliveredManagementSummary({ month: specMonth, year: specYear }, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setSpecError(res.message);
          return;
        }
        const success = res as ApiSuccess<DeliveredManagementItem[]>;
        setSpecItems(success.data ?? []);
      })
      .catch(() => setSpecError("Failed to load delivered shipment summary"))
      .finally(() => setSpecLoading(false));
  }, [accessToken, user, specMonth, specYear]);

  useEffect(() => {
    fetchSpecSummary();
  }, [fetchSpecSummary]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    Promise.all([
      getPoDashboardCounts(accessToken),
      getShipmentDashboardCounts(accessToken),
      listShipments({ page: 1, limit: RECENT_LIMIT }, accessToken),
    ])
      .then(([poRes, shipCountsRes, listRes]) => {
        if (typeof poRes === "object" && "newPoDetected" in poRes) {
          setPoCounts(poRes);
        }
        if (typeof shipCountsRes === "object" && "activeShipments" in shipCountsRes) {
          setShipmentCounts(shipCountsRes);
        }
        if (!isApiError(listRes)) {
          const success = listRes as ApiSuccess<ShipmentListItem[]>;
          setRecentShipments(success.data ?? []);
        }
      })
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (authLoading || loading) return <LoadingSkeleton lines={5} className={styles.loading} />;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <section>
      <PageHeader
        title="Dashboard"
        subtitle={user ? `Welcome, ${user.name} (${user.role})` : undefined}
      />

      <div className={styles.summaryGrid}>
        <StatsCard
          label="New Purchase Order detected"
          value={poCounts.newPoDetected}
          href="/dashboard/po?intake_status=NEW_PO_DETECTED"
          icon={<IconBox />}
        />
        <StatsCard
          label="Claimed (awaiting allocation)"
          value={poCounts.awaitingAssignment}
          href="/dashboard/po?intake_status=CLAIMED"
          aria-label="Claimed awaiting allocation"
          icon={<IconClock />}
        />
        <StatsCard
          label="Active shipments"
          value={shipmentCounts.activeShipments}
          href="/dashboard/shipments"
          aria-label="Shipments in progress (not delivered and not closed)"
          icon={<IconShip />}
        />
        <StatsCard
          label="Customs clearance"
          value={shipmentCounts.customsClearance}
          href="/dashboard/shipments?status=CUSTOMS_CLEARANCE"
          aria-label="Customs clearance"
          icon={<IconDocument />}
        />
        <StatsCard
          label="Delivered"
          value={shipmentCounts.delivered}
          href="/dashboard/shipments?status=DELIVERED"
          aria-label="Delivered"
          icon={<IconCheck />}
        />
      </div>

      <div className={styles.quickActions}>
        <span className={styles.quickActionsLabel}>Quick actions</span>
        <div className={styles.quickActionsButtons}>
          <Link href="/dashboard/po" className={styles.btnPrimary}>
            View Purchase Order
          </Link>
          <Link href="/dashboard/shipments" className={styles.btnSecondary}>
            View shipments
          </Link>
        </div>
      </div>

      {can(user, VIEW_SHIPMENTS) && (
        <div className={styles.managementSection}>
          <div className={styles.managementHeader}>
            <h2 className={styles.managementTitle}>Delivered shipments (management)</h2>
            <p className={styles.managementSubtitle}>
              One row per delivered shipment: PT and plant from the primary linked PO; total amount is delivered line
              value in IDR (same basis as shipment detail); freight is the shipment freight / service and charge
              field. Filter by delivery month and year.
            </p>
          </div>
          <div className={styles.filters}>
            <label className={styles.field}>
              <span>Month</span>
              <select value={specMonth} onChange={(e) => setSpecMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Year</span>
              <select value={specYear} onChange={(e) => setSpecYear(Number(e.target.value))}>
                {specYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={styles.refreshBtn} onClick={fetchSpecSummary} disabled={specLoading}>
              Refresh
            </button>
          </div>
          {specError && <p className={styles.specError}>{specError}</p>}
          {specLoading ? (
            <LoadingSkeleton lines={4} />
          ) : (
            <Card>
              {specItems.length === 0 ? (
                <EmptyState
                  title="No delivered shipments in this period"
                  description="Try changing month or year filters."
                />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Shipment</TableHeaderCell>
                      <TableHeaderCell>PT</TableHeaderCell>
                      <TableHeaderCell>Plant</TableHeaderCell>
                      <TableHeaderCell>Item / product classification</TableHeaderCell>
                      <TableHeaderCell>Vendor</TableHeaderCell>
                      <TableHeaderCell>Total amount (IDR)</TableHeaderCell>
                      <TableHeaderCell>Freight charge</TableHeaderCell>
                      <TableHeaderCell>Qty</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {specItems.map((row) => (
                      <TableRow key={row.shipment_id}>
                        <TableCell>
                          <Link href={`/dashboard/shipments/${row.shipment_id}`} className={styles.shipmentLink}>
                            {row.shipment_number}
                          </Link>
                        </TableCell>
                        <TableCell>{row.pt ?? "—"}</TableCell>
                        <TableCell>{row.plant ?? "—"}</TableCell>
                        <TableCell>{displayProductClassification(row.product_classification)}</TableCell>
                        <TableCell>{row.vendor_name ?? "—"}</TableCell>
                        <TableCell>{formatIdr(row.total_amount_idr)}</TableCell>
                        <TableCell>{formatOptionalIdr(row.freight_charge)}</TableCell>
                        <TableCell>{numberFmt(row.total_qty)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}
        </div>
      )}

      <div className={styles.recentSection}>
        <div className={styles.recentHeader}>
          <h2 className={styles.recentTitle}>Recent shipments</h2>
          <Link href="/dashboard/shipments" className={styles.recentLink}>
            View all
          </Link>
        </div>
        {recentShipments.length === 0 ? (
          <Card>
            <EmptyState
              title="No shipments yet"
              description="Purchase Orders can be grouped into shipments from the Purchase Order screen."
              action={
                <Link href="/dashboard/po" className={styles.btnPrimary}>
                  View PO
                </Link>
              }
            />
          </Card>
        ) : (
          <Card>
            <ul className={styles.recentList}>
              {recentShipments.map((row) => (
                <li key={row.id}>
                  <Link href={`/dashboard/shipments/${row.id}`} className={styles.recentRow}>
                    <span className={styles.recentNumber}>{row.shipment_number}</span>
                    <span className={styles.recentPo}>{row.linked_po_count ?? 0} Purchase Order(s)</span>
                    <span className={styles.recentSupplier}>{row.supplier_name ?? "—"}</span>
                    <Badge variant={statusToBadgeVariant(row.current_status)}>
                      {formatStatusLabel(row.current_status)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </section>
  );
}
