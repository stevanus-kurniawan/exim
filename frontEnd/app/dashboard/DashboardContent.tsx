"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  getPoDashboardCounts,
  getShipmentDashboardCounts,
} from "@/services/dashboard-service";
import { listShipments } from "@/services/shipments-service";
import { Card, StatsCard } from "@/components/cards";
import { PageHeader, EmptyState } from "@/components/navigation";
import { Badge } from "@/components/badges";
import { statusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { isApiError } from "@/types/api";
import type { ShipmentListItem } from "@/types/shipments";
import type { ApiSuccess } from "@/types/api";
import styles from "./DashboardContent.module.css";

const RECENT_LIMIT = 5;

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

  if (authLoading || loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <section>
      <PageHeader
        title="Dashboard"
        subtitle={user ? `Welcome, ${user.name} (${user.role})` : undefined}
      />

      <div className={styles.summaryGrid}>
        <StatsCard
          label="New PO detected"
          value={poCounts.newPoDetected}
          href="/dashboard/po?intake_status=NEW_PO_DETECTED"
          aria-label="New PO detected"
        />
        <StatsCard
          label="Awaiting assignment"
          value={poCounts.awaitingAssignment}
          href="/dashboard/po?intake_status=NOTIFIED"
          aria-label="Awaiting assignment"
        />
        <StatsCard
          label="Active shipments"
          value={shipmentCounts.activeShipments}
          href="/dashboard/shipments"
          aria-label="Active shipments"
        />
        <StatsCard
          label="Customs clearance"
          value={shipmentCounts.customsClearance}
          href="/dashboard/shipments?status=CUSTOMS_CLEARANCE"
          aria-label="Customs clearance"
        />
        <StatsCard
          label="Delivered"
          value={shipmentCounts.delivered}
          href="/dashboard/shipments?status=DELIVERED"
          aria-label="Delivered"
        />
      </div>

      <div className={styles.quickActions}>
        <span className={styles.quickActionsLabel}>Quick actions</span>
        <div className={styles.quickActionsButtons}>
          <Link href="/dashboard/po" className={styles.btnPrimary}>
            View PO
          </Link>
          <Link href="/dashboard/shipments" className={styles.btnSecondary}>
            View shipments
          </Link>
        </div>
      </div>

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
              description="POs can be grouped into shipments from the PO screen."
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
                    <span className={styles.recentPo}>{row.linked_po_count ?? 0} PO(s)</span>
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
