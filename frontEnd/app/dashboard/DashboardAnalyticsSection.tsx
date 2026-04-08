"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Filter, Plane, Ship, Truck, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/permissions";
import { PT_OPTION_LABELS, getAllPlantsSorted } from "@/lib/po-create-constants";
import { PRODUCT_CLASSIFICATION_OPTIONS, displayProductClassification } from "@/lib/product-classification";
import { getShipmentAnalytics, getShipmentAnalyticsLines } from "@/services/dashboard-service";
import { Card } from "@/components/cards";
import { LoadingSkeleton } from "@/components/feedback";
import { EmptyState } from "@/components/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/tables";
import { isApiError } from "@/types/api";
import type { ApiSuccess } from "@/types/api";
import type {
  ShipmentAnalyticsLineAggRow,
  ShipmentAnalyticsQuery,
  ShipmentAnalyticsSummary,
} from "@/types/analytics";
import {
  LogisticsDetailTable,
  type LogisticsNavigateSync,
  type TransportTab,
} from "@/components/logistics-detail-table";
import styles from "./DashboardContent.module.css";

const VIEW_SHIPMENTS = "VIEW_SHIPMENTS";

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90);
  return { from: formatYmd(from), to: formatYmd(to) };
}

type AppliedFilters = {
  dateFrom: string;
  dateTo: string;
  pts: string[];
  plants: string[];
  vendors: string[];
  productClassifications: string[];
  shipmentMethod: string;
};

type DrillState =
  | null
  | { kind: "plant"; plant: string }
  | { kind: "classification"; classification: string };

function buildAnalyticsQueryPayload(a: AppliedFilters): ShipmentAnalyticsQuery {
  return {
    date_from: a.dateFrom,
    date_to: a.dateTo,
    ...(a.pts.length ? { pts: [...a.pts] } : {}),
    ...(a.plants.length ? { plants: [...a.plants] } : {}),
    ...(a.vendors.length ? { vendor_names: [...a.vendors] } : {}),
    ...(a.productClassifications.length ? { product_classifications: [...a.productClassifications] } : {}),
    ...(a.shipmentMethod ? { shipment_method: a.shipmentMethod } : {}),
  };
}

const idrCurrency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatQtyDelivered(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
}

const CLASS_COLORS = ["#c43a31", "#6366f1", "#0ea5e9", "#16a34a", "#71717a", "#a855f7", "#ea580c"];

function formatShipByLabel(mode: string): string {
  const u = mode.trim().toUpperCase();
  if (u === "OTHER") return "Other / unset";
  if (u === "LCL" || u === "FCL") return u;
  if (u === "BULK") return "Bulk";
  return mode;
}

export function DashboardAnalyticsSection() {
  const { user, accessToken } = useAuth();
  const allowed = can(user, VIEW_SHIPMENTS);

  const initial = useMemo(() => defaultRange(), []);
  const emptyFilters = useMemo(
    (): AppliedFilters => ({
      dateFrom: initial.from,
      dateTo: initial.to,
      pts: [],
      plants: [],
      vendors: [],
      productClassifications: [],
      shipmentMethod: "",
    }),
    [initial.from, initial.to]
  );
  const [draft, setDraft] = useState<AppliedFilters>(() => ({ ...emptyFilters }));
  const [applied, setApplied] = useState<AppliedFilters>(() => ({ ...emptyFilters }));

  const [filterOpen, setFilterOpen] = useState(false);
  const [summary, setSummary] = useState<ShipmentAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillState>(null);
  const [lineAggRows, setLineAggRows] = useState<ShipmentAnalyticsLineAggRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logisticsNavigate, setLogisticsNavigate] = useState<LogisticsNavigateSync>({ token: 0, tab: "AIR" });
  const [logisticsModalOpen, setLogisticsModalOpen] = useState(false);

  const goLogisticsDetail = useCallback((tab: TransportTab) => {
    setDrill(null);
    setLogisticsNavigate((prev) => ({ token: prev.token + 1, tab }));
    setLogisticsModalOpen(true);
  }, []);

  const plantsSorted = useMemo(() => getAllPlantsSorted(), []);

  const loadSummary = useCallback(async () => {
    if (!accessToken || !allowed) return;
    setLoading(true);
    setError(null);
    const q = buildAnalyticsQueryPayload(applied);
    const res = await getShipmentAnalytics(q, accessToken);
    if (isApiError(res)) {
      setError(res.message ?? "Failed to load analytics");
      setSummary(null);
    } else {
      setSummary((res as ApiSuccess<ShipmentAnalyticsSummary>).data ?? null);
    }
    setLoading(false);
  }, [accessToken, allowed, applied]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!drill || !accessToken || !allowed) {
      setLineAggRows([]);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);

    const linesQuery = {
      ...buildAnalyticsQueryPayload(applied),
      detail_kind: drill.kind,
      ...(drill.kind === "plant" && drill.plant !== "__ALL__" ? { detail_plant: drill.plant } : {}),
      ...(drill.kind === "classification" && drill.classification !== "__ALL__"
        ? { detail_classification: drill.classification }
        : {}),
    };

    getShipmentAnalyticsLines(linesQuery, accessToken)
      .then((res) => {
        if (cancelled) return;
        if (isApiError(res) || !res.success) {
          setLineAggRows([]);
          return;
        }
        setLineAggRows((res as ApiSuccess<ShipmentAnalyticsLineAggRow[]>).data ?? []);
      })
      .catch(() => {
        if (!cancelled) setLineAggRows([]);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [drill, applied, accessToken, allowed]);

  const applyFilters = () => {
    setApplied({ ...draft });
    setFilterOpen(false);
    setDrill(null);
    setLogisticsModalOpen(false);
  };

  const resetFilters = () => {
    const r = defaultRange();
    const empty: AppliedFilters = {
      dateFrom: r.from,
      dateTo: r.to,
      pts: [],
      plants: [],
      vendors: [],
      productClassifications: [],
      shipmentMethod: "",
    };
    setDraft(empty);
    setApplied(empty);
    setDrill(null);
    setLogisticsModalOpen(false);
  };

  const allPlants = summary?.by_plant ?? [];
  const maxPlant = Math.max(1, ...allPlants.map((p) => p.count));

  const donutGradient = useMemo(() => {
    const rows = summary?.by_classification ?? [];
    if (rows.length === 0) return "conic-gradient(var(--color-primitive-border-light, #e0e0e0) 0deg 360deg)";
    const total = rows.reduce((s, r) => s + r.count, 0);
    let acc = 0;
    const parts: string[] = [];
    rows.forEach((r, i) => {
      const deg = (r.count / total) * 360;
      const start = acc;
      acc += deg;
      const color = CLASS_COLORS[i % CLASS_COLORS.length];
      parts.push(`${color} ${start}deg ${acc}deg`);
    });
    return `conic-gradient(${parts.join(", ")})`;
  }, [summary?.by_classification]);

  const logisticsTotal =
    (summary?.logistics.air ?? 0) + (summary?.logistics.sea ?? 0) + (summary?.logistics.other ?? 0) || 1;

  const otherIsDominant =
    (summary?.logistics.other ?? 0) > (summary?.logistics.air ?? 0) + (summary?.logistics.sea ?? 0);

  const seaBarSegments = useMemo(() => {
    const sl = summary?.sea_logistics;
    if (!sl?.by_ship_by.length) return [];
    const upperMap = new Map(sl.by_ship_by.map((r) => [r.ship_by.toUpperCase(), r.count]));
    const order = ["BULK", "LCL", "FCL", "OTHER"];
    const total = sl.by_ship_by.reduce((s, r) => s + r.count, 0) || 1;
    const colors: Record<string, string> = {
      BULK: "#64748b",
      LCL: "#6366f1",
      FCL: "#4338ca",
      OTHER: "#94a3b8",
    };
    return order.map((key) => ({
      key,
      count: upperMap.get(key) ?? 0,
      pct: ((upperMap.get(key) ?? 0) / total) * 100,
      color: colors[key] ?? "#94a3b8",
      label: formatShipByLabel(key),
    }));
  }, [summary?.sea_logistics]);

  useEffect(() => {
    if (drill) setLogisticsModalOpen(false);
  }, [drill]);

  useEffect(() => {
    if (!drill && !logisticsModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrill(null);
        setLogisticsModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drill, logisticsModalOpen]);

  const dateRangeLabel = useMemo(() => {
    const a = new Date(`${applied.dateFrom}T12:00:00`);
    const b = new Date(`${applied.dateTo}T12:00:00`);
    const f = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
    return `${f.format(a)} → ${f.format(b)}`;
  }, [applied.dateFrom, applied.dateTo]);

  const isDefaultDateRange = useMemo(() => {
    const r = defaultRange();
    return r.from === applied.dateFrom && r.to === applied.dateTo;
  }, [applied.dateFrom, applied.dateTo]);

  const removeDateChip = () => {
    const r = defaultRange();
    const next = { dateFrom: r.from, dateTo: r.to };
    setApplied((prev) => ({ ...prev, ...next }));
    setDraft((prev) => ({ ...prev, ...next }));
  };

  if (!allowed) return null;

  return (
    <div className={styles.managementSection}>
      <div className={styles.analyticsViewport}>
        <div className={styles.managementHeader}>
          <h2 className={styles.managementTitle}>Shipment analytics</h2>
        </div>

        <div className={styles.analyticsTopBar}>
          <button
            type="button"
            className={styles.analyticsFilterPrimaryBtn}
            onClick={() => setFilterOpen(true)}
          >
            <Filter size={18} strokeWidth={2} aria-hidden />
            Filter
          </button>
          <button type="button" className={styles.refreshBtn} onClick={loadSummary} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className={styles.analyticsChipRow}>
          {!isDefaultDateRange && (
            <span className={styles.analyticsChip}>
              Date: {dateRangeLabel}
              <button
                type="button"
                className={styles.analyticsChipRemove}
                aria-label="Reset date range"
                onClick={removeDateChip}
              >
                <X size={14} />
              </button>
            </span>
          )}
          {applied.pts.map((pt) => (
            <span key={pt} className={styles.analyticsChip}>
              PT: {pt}
              <button
                type="button"
                className={styles.analyticsChipRemove}
                aria-label={`Remove ${pt}`}
                onClick={() => {
                  setApplied((p) => ({ ...p, pts: p.pts.filter((x) => x !== pt) }));
                  setDraft((p) => ({ ...p, pts: p.pts.filter((x) => x !== pt) }));
                }}
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {applied.plants.map((pl) => (
            <span key={pl} className={styles.analyticsChip}>
              Plant: {pl}
              <button
                type="button"
                className={styles.analyticsChipRemove}
                aria-label={`Remove ${pl}`}
                onClick={() => {
                  setApplied((p) => ({ ...p, plants: p.plants.filter((x) => x !== pl) }));
                  setDraft((p) => ({ ...p, plants: p.plants.filter((x) => x !== pl) }));
                }}
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {applied.vendors.map((v) => (
            <span key={v} className={styles.analyticsChip}>
              Vendor: {v}
              <button
                type="button"
                className={styles.analyticsChipRemove}
                aria-label={`Remove ${v}`}
                onClick={() => {
                  setApplied((p) => ({ ...p, vendors: p.vendors.filter((x) => x !== v) }));
                  setDraft((p) => ({ ...p, vendors: p.vendors.filter((x) => x !== v) }));
                }}
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {applied.productClassifications.map((c) => (
            <span key={c} className={styles.analyticsChip}>
              Class: {displayProductClassification(c)}
              <button
                type="button"
                className={styles.analyticsChipRemove}
                aria-label={`Remove ${c}`}
                onClick={() => {
                  const fn = (p: AppliedFilters) => ({
                    ...p,
                    productClassifications: p.productClassifications.filter((x) => x !== c),
                  });
                  setApplied(fn);
                  setDraft(fn);
                }}
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {applied.shipmentMethod ? (
            <span className={styles.analyticsChip}>
              Ship via: {applied.shipmentMethod}
              <button
                type="button"
                className={styles.analyticsChipRemove}
                aria-label="Remove ship via"
                onClick={() => {
                  setApplied((p) => ({ ...p, shipmentMethod: "" }));
                  setDraft((p) => ({ ...p, shipmentMethod: "" }));
                }}
              >
                <X size={14} />
              </button>
            </span>
          ) : null}
        </div>

        {error && <p className={styles.specError}>{error}</p>}

      {loading && !summary ? (
        <LoadingSkeleton lines={8} />
      ) : (
        <>
          <div className={styles.analyticsGrid}>
            <Card
              className={styles.analyticsInteractiveCard}
              onClick={() => setDrill({ kind: "plant", plant: "__ALL__" })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDrill({ kind: "plant", plant: "__ALL__" });
                }
              }}
            >
              <div className={styles.analyticsCardTop}>
                <h3 className={styles.analyticsCardTitle}>Import by plant</h3>
                <button
                  type="button"
                  className={styles.analyticsTextBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrill({ kind: "plant", plant: "__ALL__" });
                  }}
                >
                  Table view
                </button>
              </div>
              <div className={styles.analyticsKpiHero}>
                <span className={styles.analyticsKpiNumber}>{summary?.total_shipments ?? 0}</span>
                <span className={styles.analyticsKpiSuffixLarge}>shipments</span>
              </div>
              <ul className={styles.analyticsPlantList}>
                {allPlants.length === 0 ? (
                  <li className={styles.subsectionHint}>No data in range</li>
                ) : (
                  allPlants.map((p) => (
                    <li key={p.plant}>
                      <button
                        type="button"
                        className={styles.analyticsPlantRowBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrill({ kind: "plant", plant: p.plant });
                        }}
                      >
                        <div className={styles.analyticsPlantRowMeta}>
                          <span className={styles.analyticsPlantName}>{p.plant}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className={styles.analyticsPlantCount}>{p.count}</span>
                            <ChevronRight className={styles.plantRowChevron} size={18} aria-hidden />
                          </span>
                        </div>
                        <div className={styles.analyticsBarTrackThin}>
                          <div
                            className={styles.analyticsBarFillBrand}
                            style={{ width: `${(p.count / maxPlant) * 100}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card
              className={styles.analyticsInteractiveCard}
              onClick={() => setDrill({ kind: "classification", classification: "__ALL__" })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDrill({ kind: "classification", classification: "__ALL__" });
                }
              }}
            >
              <div className={styles.analyticsCardTop}>
                <h3 className={styles.analyticsCardTitle}>By classification</h3>
                <button
                  type="button"
                  className={styles.analyticsTextBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDrill({ kind: "classification", classification: "__ALL__" });
                  }}
                >
                  Table view
                </button>
              </div>
              <div className={styles.analyticsClassPillOnly}>
                <div
                  className={styles.analyticsDonutLg}
                  style={{ background: donutGradient }}
                  role="img"
                  aria-label="Classification mix"
                />
              </div>
              <div className={styles.analyticsPillRow}>
                {(summary?.by_classification ?? []).map((r, i) => (
                  <button
                    key={r.classification}
                    type="button"
                    className={styles.analyticsPill}
                    style={{ borderColor: `${CLASS_COLORS[i % CLASS_COLORS.length]}55` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrill({ kind: "classification", classification: r.classification });
                    }}
                  >
                    {displayProductClassification(r.classification)} · {r.count}
                  </button>
                ))}
              </div>
            </Card>

            <Card
              className={styles.analyticsInteractiveCard}
              onClick={() => goLogisticsDetail("AIR")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goLogisticsDetail("AIR");
                }
              }}
            >
              <div className={styles.analyticsLogisticsHeaderRow}>
                <h3 className={styles.analyticsCardTitle} style={{ margin: 0 }}>
                  Logistics split
                </h3>
                <p
                  className={styles.analyticsTrendHint}
                  title="Year-over-year comparison is not available yet."
                >
                  YoY vs last year · n/a
                </p>
              </div>
              <div className={styles.analyticsCardTop} style={{ marginTop: 0 }}>
                <span className={styles.analyticsKpiSuffixLarge} style={{ paddingBottom: 0 }}>
                  {summary?.total_shipments ?? 0} shipments in view
                </span>
                <button
                  type="button"
                  className={styles.analyticsTextBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    goLogisticsDetail("AIR");
                  }}
                >
                  Table view
                </button>
              </div>
              <div className={styles.logisticsGrid}>
                <button
                  type="button"
                  className={`${styles.logisticsTile} ${styles.logisticsTileAir} ${styles.analyticsCardInnerStop}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goLogisticsDetail("AIR");
                  }}
                >
                  <div className={styles.logisticsIconWrap}>
                    <Plane size={22} strokeWidth={1.75} aria-hidden />
                  </div>
                  <p className={styles.logisticsTileValue}>{summary?.logistics.air ?? 0}</p>
                  <p className={styles.logisticsTileLabel}>Air</p>
                </button>
                <button
                  type="button"
                  className={`${styles.logisticsTile} ${styles.logisticsTileSea} ${styles.analyticsCardInnerStop}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goLogisticsDetail("LCL");
                  }}
                >
                  <div className={styles.logisticsIconWrap}>
                    <Ship size={22} strokeWidth={1.75} aria-hidden />
                  </div>
                  <p className={styles.logisticsTileValue}>{summary?.logistics.sea ?? 0}</p>
                  <p className={styles.logisticsTileLabel}>Sea</p>
                </button>
                <button
                  type="button"
                  className={`${styles.logisticsTile} ${styles.analyticsCardInnerStop} ${
                    otherIsDominant ? styles.logisticsTileOtherDominant : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goLogisticsDetail("BULK");
                  }}
                >
                  <div className={styles.logisticsIconWrap}>
                    <Truck size={22} strokeWidth={1.75} aria-hidden />
                  </div>
                  <p className={styles.logisticsTileValue}>{summary?.logistics.other ?? 0}</p>
                  <p className={styles.logisticsTileLabel}>
                    {otherIsDominant ? "Other modes (road, etc.)" : "Other"}
                  </p>
                </button>
              </div>
              <div className={styles.logisticsStackBar}>
                <div
                  className={styles.logisticsStackSegAir}
                  style={{ width: `${((summary?.logistics.air ?? 0) / logisticsTotal) * 100}%` }}
                />
                <div
                  className={styles.logisticsStackSegSea}
                  style={{ width: `${((summary?.logistics.sea ?? 0) / logisticsTotal) * 100}%` }}
                />
                <div
                  className={styles.logisticsStackSegOther}
                  style={{ width: `${((summary?.logistics.other ?? 0) / logisticsTotal) * 100}%` }}
                />
              </div>
              {summary?.sea_logistics && (summary.logistics.sea ?? 0) > 0 && (
                <div className={styles.seaLoadSection} onClick={(e) => e.stopPropagation()}>
                  <p className={styles.seaLoadLabel}>Sea — load type (shipments)</p>
                  <div className={styles.seaSegTrack}>
                    {seaBarSegments.map((seg) => (
                      <div
                        key={seg.key}
                        className={styles.seaSegChunk}
                        style={{ width: `${Math.max(seg.pct, 0)}%`, backgroundColor: seg.color }}
                        title={`${seg.label}: ${seg.count}`}
                      />
                    ))}
                  </div>
                  <ul className={styles.seaSegLegend}>
                    {seaBarSegments.map((seg) => (
                      <li key={seg.key}>
                        <span
                          className={styles.seaSegSwatch}
                          style={{ backgroundColor: seg.color }}
                        />
                        {seg.label} · {seg.count}
                      </li>
                    ))}
                  </ul>
                  <p className={styles.seaLoadCaption}>
                    LCL — total packages: {summary.sea_logistics.lcl_package_count_total}. FCL containers
                    (20′ / 40′ / ISO tank): {summary.sea_logistics.fcl_container_totals.container_20ft} /{" "}
                    {summary.sea_logistics.fcl_container_totals.container_40ft} /{" "}
                    {summary.sea_logistics.fcl_container_totals.iso_tank_20}.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {logisticsModalOpen && (
            <div
              className={styles.analyticsDrillBackdrop}
              role="presentation"
              onClick={() => setLogisticsModalOpen(false)}
            >
              <div
                id="logistics-detail-root"
                className={`${styles.analyticsDrillModal} ${styles.analyticsLogisticsModal}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="logistics-detail-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.analyticsDrillModalHeader}>
                  <h3 id="logistics-detail-modal-title" className={styles.analyticsDrillModalTitle}>
                    Logistics detail
                  </h3>
                  <button
                    type="button"
                    className={styles.analyticsDrillClose}
                    aria-label="Close"
                    onClick={() => setLogisticsModalOpen(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className={styles.analyticsDrillBody}>
                  <LogisticsDetailTable
                    navigate={logisticsNavigate}
                    detailRootId={null}
                    variant="modal"
                  />
                </div>
              </div>
            </div>
          )}

          {drill && (
            <div
              className={styles.analyticsDrillBackdrop}
              role="presentation"
              onClick={() => setDrill(null)}
            >
              <div
                className={styles.analyticsDrillModal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="analytics-drill-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.analyticsDrillModalHeader}>
                  <h3 id="analytics-drill-title" className={styles.analyticsDrillModalTitle}>
                    {drill.kind === "plant" &&
                      (drill.plant === "__ALL__"
                        ? "All plants (current filters)"
                        : `Plant · ${drill.plant}`)}
                    {drill.kind === "classification" &&
                      (drill.classification === "__ALL__"
                        ? "All classifications (current filters)"
                        : `Classification · ${displayProductClassification(drill.classification)}`)}
                  </h3>
                  <button
                    type="button"
                    className={styles.analyticsDrillClose}
                    aria-label="Close"
                    onClick={() => setDrill(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className={styles.analyticsDrillBody}>
              {detailLoading ? (
                <p className={styles.subsectionHint}>Loading…</p>
              ) : lineAggRows.length === 0 ? (
                <EmptyState
                  title="No lines"
                  description="No PO line receipts match this slice for the selected period and filters."
                />
              ) : (
                <div className={styles.procurementTableWrap}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Item description</TableHeaderCell>
                        <TableHeaderCell>PT</TableHeaderCell>
                        <TableHeaderCell>Plant</TableHeaderCell>
                        <TableHeaderCell>Unit</TableHeaderCell>
                        <TableHeaderCell>Total qty delivered</TableHeaderCell>
                        <TableHeaderCell>Total price (IDR)</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineAggRows.map((row) => (
                        <TableRow
                          key={`${row.item_description}|${row.pt ?? ""}|${row.plant ?? ""}`}
                        >
                          <TableCell>{row.item_description}</TableCell>
                          <TableCell>{row.pt ?? "—"}</TableCell>
                          <TableCell>{row.plant ?? "—"}</TableCell>
                          <TableCell>{row.unit?.trim() ? row.unit.trim() : "—"}</TableCell>
                          <TableCell>{formatQtyDelivered(row.total_qty_delivered)}</TableCell>
                          <TableCell>{idrCurrency.format(row.total_price_idr)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {filterOpen && (
        <div className={styles.filterOverlay}>
          <button
            type="button"
            className={styles.filterBackdrop}
            aria-label="Close filters"
            onClick={() => setFilterOpen(false)}
          />
          <aside
            className={styles.filterAside}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-analytics-filter-title"
          >
            <div className={styles.filterAsideHeader}>
              <h2 id="dash-analytics-filter-title" className={styles.filterAsideTitle}>
                Filters
              </h2>
              <button
                type="button"
                className={styles.filterIconBtn}
                aria-label="Close"
                onClick={() => setFilterOpen(false)}
              >
                <span aria-hidden style={{ fontSize: "1.25rem", lineHeight: 1 }}>
                  ×
                </span>
              </button>
            </div>
            <div className={styles.filterAsideBody}>
              <div className={styles.dateRangeUnified}>
                <span className={styles.dateRangeUnifiedLabel}>Transaction date (start to end)</span>
                <div className={styles.dateRangeInputs}>
                  <label className={styles.field}>
                    <span>Start</span>
                    <input
                      type="date"
                      value={draft.dateFrom}
                      onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>End</span>
                    <input
                      type="date"
                      value={draft.dateTo}
                      onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
              <div>
                <div className={styles.analyticsMultiFieldLabel}>PT (company entity)</div>
                <div className={styles.analyticsCheckboxScroll}>
                  {PT_OPTION_LABELS.map((pt) => (
                    <label key={pt} className={styles.analyticsCheckRow}>
                      <input
                        type="checkbox"
                        checked={draft.pts.includes(pt)}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            pts: d.pts.includes(pt) ? d.pts.filter((x) => x !== pt) : [...d.pts, pt],
                          }))
                        }
                      />
                      {pt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className={styles.analyticsMultiFieldLabel}>Plant</div>
                <div className={styles.analyticsCheckboxScroll}>
                  {plantsSorted.map((p) => (
                    <label key={p} className={styles.analyticsCheckRow}>
                      <input
                        type="checkbox"
                        checked={draft.plants.includes(p)}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            plants: d.plants.includes(p)
                              ? d.plants.filter((x) => x !== p)
                              : [...d.plants, p],
                          }))
                        }
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className={styles.analyticsMultiFieldLabel}>Vendor</div>
                <div className={styles.analyticsCheckboxScroll}>
                  {(summary?.vendor_options ?? []).length === 0 ? (
                    <span className={styles.subsectionHint}>Load analytics once to populate vendors.</span>
                  ) : (
                    (summary?.vendor_options ?? []).map((v) => (
                      <label key={v} className={styles.analyticsCheckRow}>
                        <input
                          type="checkbox"
                          checked={draft.vendors.includes(v)}
                          onChange={() =>
                            setDraft((d) => ({
                              ...d,
                              vendors: d.vendors.includes(v)
                                ? d.vendors.filter((x) => x !== v)
                                : [...d.vendors, v],
                            }))
                          }
                        />
                        {v}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className={styles.analyticsMultiFieldLabel}>Product classification</div>
                <div className={styles.analyticsCheckboxScroll}>
                  {PRODUCT_CLASSIFICATION_OPTIONS.map((c) => (
                    <label key={c} className={styles.analyticsCheckRow}>
                      <input
                        type="checkbox"
                        checked={draft.productClassifications.includes(c)}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            productClassifications: d.productClassifications.includes(c)
                              ? d.productClassifications.filter((x) => x !== c)
                              : [...d.productClassifications, c],
                          }))
                        }
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <label className={styles.field}>
                <span>Ship via</span>
                <select
                  value={draft.shipmentMethod}
                  onChange={(e) => setDraft((d) => ({ ...d, shipmentMethod: e.target.value }))}
                >
                  <option value="">All</option>
                  <option value="AIR">Air</option>
                  <option value="SEA">Sea</option>
                </select>
              </label>
            </div>
            <div className={styles.filterAsideFooter}>
              <button type="button" className={styles.btnSecondary} style={{ flex: 1 }} onClick={resetFilters}>
                Reset
              </button>
              <button type="button" className={styles.refreshBtn} style={{ flex: 1 }} onClick={applyFilters}>
                Apply filters
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
