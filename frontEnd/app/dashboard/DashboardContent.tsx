"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { getPoDashboardCounts, getShipmentDashboardCounts } from "@/services/dashboard-service";
import { listShipments } from "@/services/shipments-service";
import { Card, StatsCard } from "@/components/cards";
import { LoadingSkeleton } from "@/components/feedback";
import { PageHeader, EmptyState } from "@/components/navigation";
import { IconBox, IconClock, IconShip, IconDocument, IconCheck } from "@/components/icons/KpiIcons";
import { formatStatusLabel } from "@/lib/status-badge";
import { getRecentDateRange } from "@/lib/recent-date-range";
import { dashboardShipmentBadgeVariant } from "@/lib/dashboard-shipment-badge";
import { can } from "@/lib/permissions";
import { isApiError } from "@/types/api";
import type { ShipmentListItem } from "@/types/shipments";
import type { ApiSuccess } from "@/types/api";
import { DashboardAnalyticsSection } from "./DashboardAnalyticsSection";
import styles from "./DashboardContent.module.css";

const RECENT_LIMIT = 5;
const RECENT_PO_DATE_DAYS = 7;
const VIEW_SHIPMENTS = "VIEW_SHIPMENTS";

function formatPoSummaryLine(count: number): string {
  if (count <= 0) return "0 PO";
  if (count === 1) return "1 PO";
  return `${count} POs`;
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

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    const { from, to } = getRecentDateRange(RECENT_PO_DATE_DAYS);
    Promise.all([
      getPoDashboardCounts(accessToken),
      getShipmentDashboardCounts(accessToken),
      listShipments(
        { page: 1, limit: RECENT_LIMIT, po_from_date: from, po_to_date: to },
        accessToken
      ),
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

  const { from: viewAllPoFrom, to: viewAllPoTo } = getRecentDateRange(RECENT_PO_DATE_DAYS);
  const viewAllShipmentsHref = `/dashboard/shipments?po_from_date=${encodeURIComponent(viewAllPoFrom)}&po_to_date=${encodeURIComponent(viewAllPoTo)}`;

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

      {can(user, VIEW_SHIPMENTS) && <DashboardAnalyticsSection />}

      <div className={styles.recentSection}>
        <div className={styles.recentHeader}>
          <h2 className={styles.recentTitle}>Recent shipments</h2>
          <Link href={viewAllShipmentsHref} className={styles.recentLink}>
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
              {recentShipments.map((row) => {
                const badgeKey = dashboardShipmentBadgeVariant(row.current_status);
                const badgeClass =
                  badgeKey === "delivered"
                    ? styles.badgeDelivered
                    : badgeKey === "green"
                      ? styles.badgeGreen
                      : badgeKey === "blue"
                        ? styles.badgeBlue
                        : styles.badgeSlate;
                return (
                  <li key={row.id}>
                    <Link href={`/dashboard/shipments/${row.id}`} className={styles.recentRow}>
                      <span className={styles.recentNumber}>{row.shipment_number}</span>
                      <span className={styles.recentPo}>{formatPoSummaryLine(row.linked_po_count ?? 0)}</span>
                      <span className={styles.recentSupplier}>{row.vendor_name ?? row.supplier_name ?? "—"}</span>
                      <span className={`${styles.recentStatus} ${badgeClass}`}>
                        {formatStatusLabel(row.current_status)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </section>
  );
}
