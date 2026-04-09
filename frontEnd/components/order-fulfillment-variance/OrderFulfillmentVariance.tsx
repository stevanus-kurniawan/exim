"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { listPo, getPoDetail } from "@/services/po-service";
import { isApiError } from "@/types/api";
import type { ApiSuccess } from "@/types/api";
import type { PoListItem, PoDetail, PoItemSummary } from "@/types/po";
import { Card } from "@/components/cards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/tables";
import { amountToDashboardUsd, useDashboardCurrency } from "@/lib/dashboard-currency-context";
import styles from "./OrderFulfillmentVariance.module.css";

const PO_PAGES = 6;
const PO_LIMIT = 50;
const REASON_STORAGE_KEY = "eos.fulfillment.reason.v1";
const CRITICAL_DEFAULT_PCT = 10;

const REASON_OPTIONS = [
  "",
  "Supplier Stock-out",
  "Partial Shipment",
  "Incorrect Entry",
  "Other",
] as const;

type ReasonMap = Record<string, string>;

function loadReasonMap(): ReasonMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REASON_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as ReasonMap) : {};
  } catch {
    return {};
  }
}

function saveReason(key: string, value: string) {
  const next = loadReasonMap();
  if (!value) delete next[key];
  else next[key] = value;
  localStorage.setItem(REASON_STORAGE_KEY, JSON.stringify(next));
}

function lineKey(intakeId: string, itemId: string): string {
  return `${intakeId}:${itemId}`;
}

function unitPrice(item: PoItemSummary): number | null {
  const q = Number(item.qty ?? 0);
  const v = item.value;
  if (v == null || !Number.isFinite(Number(v)) || q <= 0) return null;
  return Number(v);
}

function lineVariancePct(ordered: number, shipped: number): number | null {
  if (!Number.isFinite(ordered) || ordered <= 0) return null;
  return ((shipped - ordered) / ordered) * 100;
}

/**
 * Fulfillment variance only includes POs that are coupled to at least one shipment
 * and where at least one linked shipment has status DELIVERED.
 */
function poHasShipmentWithDelivered(detail: PoDetail): boolean {
  const linked = detail.linked_shipments ?? [];
  if (linked.length === 0) return false;
  return linked.some((s) => String(s.current_status).trim().toUpperCase() === "DELIVERED");
}

function poFulfillmentPct(detail: PoDetail): number | null {
  let o = 0;
  let r = 0;
  for (const it of detail.items) {
    const q = Number(it.qty ?? 0);
    const rec = Number(it.received_qty ?? 0);
    if (Number.isFinite(q) && q > 0) {
      o += q;
      r += rec;
    }
  }
  if (o <= 0) return null;
  return (r / o) * 100;
}

export type VendorFulfillmentRow = {
  vendor: string;
  totalOrdered: number;
  totalReceived: number;
  accuracyPct: number;
  /** Signed deviation from 100% (accuracy - 100). */
  deviationPct: number;
  /** |deviation| for ranking unreliability */
  absDeviation: number;
};

function aggregateVendors(details: PoDetail[]): VendorFulfillmentRow[] {
  const byVendor = new Map<
    string,
    { ordered: number; received: number }
  >();
  for (const d of details) {
    const v = d.supplier_name?.trim() || "—";
    const cur = byVendor.get(v) ?? { ordered: 0, received: 0 };
    for (const it of d.items) {
      const q = Number(it.qty ?? 0);
      const rec = Number(it.received_qty ?? 0);
      if (Number.isFinite(q) && q >= 0) {
        cur.ordered += q;
        cur.received += rec;
      }
    }
    byVendor.set(v, cur);
  }
  const rows: VendorFulfillmentRow[] = [];
  for (const [vendor, { ordered, received }] of byVendor) {
    if (ordered <= 0) continue;
    const accuracyPct = (received / ordered) * 100;
    const deviationPct = accuracyPct - 100;
    rows.push({
      vendor,
      totalOrdered: ordered,
      totalReceived: received,
      accuracyPct,
      deviationPct,
      absDeviation: Math.abs(deviationPct),
    });
  }
  return rows.sort((a, b) => b.absDeviation - a.absDeviation);
}

export type DetailLineRow = {
  intakeId: string;
  poNumber: string;
  itemId: string;
  itemDescription: string;
  orderedQty: number;
  shippedQty: number;
  variancePct: number | null;
  /** Financial impact in PO line currency (unit × variance qty). */
  impactValue: number | null;
  poCurrency: string | null;
};

function buildDetailLines(detail: PoDetail): DetailLineRow[] {
  return detail.items.map((it) => {
    const ordered = Number(it.qty ?? 0);
    const shipped = Number(it.received_qty ?? 0);
    const vp = lineVariancePct(ordered, shipped);
    const up = unitPrice(it);
    const impact =
      up != null && Number.isFinite(ordered) ? (shipped - ordered) * up : null;
    return {
      intakeId: detail.id,
      poNumber: detail.po_number,
      itemId: it.id,
      itemDescription: it.item_description?.trim() || "—",
      orderedQty: ordered,
      shippedQty: shipped,
      variancePct: vp,
      impactValue: impact,
      poCurrency: detail.currency ?? null,
    };
  });
}

type Props = {
  accessToken: string | null;
  allowed: boolean;
};

export function OrderFulfillmentVariance({ accessToken, allowed }: Props) {
  const { idrPerUsd, formatUsd } = useDashboardCurrency();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PoDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drillVendor, setDrillVendor] = useState<string | null>(null);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState(CRITICAL_DEFAULT_PCT);
  const [reasonMap, setReasonMap] = useState<ReasonMap>({});

  useEffect(() => {
    setReasonMap(loadReasonMap());
  }, [drillVendor]);

  const load = useCallback(async () => {
    if (!accessToken || !allowed) return;
    setLoading(true);
    setError(null);
    try {
      const ids: string[] = [];
      for (let page = 1; page <= PO_PAGES; page += 1) {
        const res = await listPo({ page, limit: PO_LIMIT }, accessToken);
        if (isApiError(res) || !res.success) break;
        const chunk = (res as ApiSuccess<PoListItem[]>).data ?? [];
        ids.push(...chunk.map((p) => p.id));
        if (chunk.length < PO_LIMIT) break;
      }
      const out: PoDetail[] = [];
      for (let i = 0; i < ids.length; i += 8) {
        const chunk = ids.slice(i, i + 8);
        const batch = await Promise.all(chunk.map((id) => getPoDetail(id, accessToken)));
        for (const r of batch) {
          if (!isApiError(r) && r.success && r.data) out.push(r.data);
        }
      }
      setDetails(out.filter(poHasShipmentWithDelivered));
    } catch {
      setError("Failed to load fulfillment data");
      setDetails([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, allowed]);

  useEffect(() => {
    load();
  }, [load]);

  const vendors = useMemo(() => aggregateVendors(details), [details]);

  const overall = useMemo(() => {
    let o = 0;
    let r = 0;
    for (const d of details) {
      for (const it of d.items) {
        const q = Number(it.qty ?? 0);
        const rec = Number(it.received_qty ?? 0);
        if (Number.isFinite(q) && q > 0) {
          o += q;
          r += rec;
        }
      }
    }
    if (o <= 0) return null;
    return (r / o) * 100;
  }, [details]);

  const top5Unreliable = useMemo(() => vendors.slice(0, 5), [vendors]);

  const sparklineByVendor = useMemo(() => {
    const m = new Map<string, number[]>();
    const byVendorLists = new Map<string, PoDetail[]>();
    for (const d of details) {
      const v = d.supplier_name?.trim() || "—";
      const list = byVendorLists.get(v) ?? [];
      list.push(d);
      byVendorLists.set(v, list);
    }
    for (const [v, list] of byVendorLists) {
      const sorted = [...list].sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
      );
      const pts = sorted
        .slice(0, 5)
        .map((d) => poFulfillmentPct(d))
        .filter((p): p is number => p != null);
      if (pts.length) m.set(v, pts);
    }
    return m;
  }, [details]);

  const drillDetails = useMemo(() => {
    if (!drillVendor) return [];
    return details.filter((d) => (d.supplier_name?.trim() || "—") === drillVendor);
  }, [details, drillVendor]);

  const drillRows = useMemo(() => {
    const rows: DetailLineRow[] = [];
    for (const d of drillDetails) {
      rows.push(...buildDetailLines(d));
    }
    const filtered = criticalOnly
      ? rows.filter((row) => {
          const v = row.variancePct;
          if (v == null) return false;
          return Math.abs(v) >= criticalThreshold;
        })
      : rows;
    return filtered;
  }, [drillDetails, criticalOnly, criticalThreshold]);

  const pctFmt = (n: number) =>
    `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  function impactUsd(row: DetailLineRow): string {
    if (row.impactValue == null) return "—";
    const usd = amountToDashboardUsd(row.impactValue, row.poCurrency, idrPerUsd);
    return formatUsd(usd, true);
  }

  function StatusCell({ variancePct }: { variancePct: number | null }) {
    if (variancePct == null)
      return <span className={styles.statusMuted}>—</span>;
    if (Math.abs(variancePct) < 0.05)
      return (
        <span className={styles.statusOk}>
          <span className={styles.statusDot} /> Perfect match
        </span>
      );
    if (variancePct < 0)
      return (
        <span className={styles.statusBad}>
          <ArrowDown size={14} strokeWidth={2.5} aria-hidden />
          {pctFmt(variancePct)}
        </span>
      );
    return (
      <span className={styles.statusWarn}>
        <ArrowUp size={14} strokeWidth={2.5} aria-hidden />
        {pctFmt(variancePct)}
      </span>
    );
  }

  function Sparkline({ values }: { values: number[] }) {
    if (values.length < 2) return <span className={styles.sparkMuted}>—</span>;
    const w = 56;
    const h = 20;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x},${y}`;
    });
    const latestDelta = values[values.length - 1] - values[values.length - 2];
    const stroke =
      latestDelta < 0 ? "#c43a31" : latestDelta > 0 ? "#15803d" : "#64748b";
    return (
      <svg
        className={styles.sparkSvg}
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden
      >
        <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={pts.join(" ")} />
      </svg>
    );
  }

  if (!allowed) return null;

  return (
    <>
      <Card className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>Order fulfillment variance</h3>
          {loading && <span className={styles.hint}>Loading…</span>}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <p className={styles.accuracyHero}>
          <span className={styles.accuracyLabel}>Fulfillment accuracy</span>
          <span className={styles.accuracyValue}>
            {overall != null ? `${overall.toFixed(1)}%` : "—"}
          </span>
          <span className={styles.accuracySub}>
            Total received ÷ total ordered — POs with a shipment and at least one shipment delivered
          </span>
        </p>

        <div className={styles.bulletRow}>
          <div className={styles.bulletLabels}>
            <span>0%</span>
            <span className={styles.bulletTarget}>100% target</span>
            <span>200%</span>
          </div>
          <div className={styles.bulletTrack}>
            {top5Unreliable.map((v) => {
              const maxDev = 50;
              const dev = Math.max(-maxDev, Math.min(maxDev, v.deviationPct));
              const barWidthPct = (Math.abs(dev) / maxDev) * 50;
              const isLeft = v.deviationPct < 0;
              return (
                <button
                  key={v.vendor}
                  type="button"
                  className={styles.vendorBulletRow}
                  onClick={() => setDrillVendor(v.vendor)}
                >
                  <span className={styles.vendorBulletName} title={v.vendor}>
                    {v.vendor}
                  </span>
                  <div className={styles.bulletBarWrap}>
                    <div className={styles.bulletCenter} />
                    <div
                      className={`${styles.bulletBar} ${
                        isLeft ? styles.bulletBarUnder : styles.bulletBarOver
                      }`}
                      style={
                        isLeft
                          ? { left: `${50 - barWidthPct}%`, width: `${barWidthPct}%` }
                          : { left: "50%", width: `${barWidthPct}%` }
                      }
                    />
                  </div>
                  <span className={styles.vendorBulletPct}>
                    {v.accuracyPct.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.top5}>
          <p className={styles.top5Title}>Top variance (most unreliable)</p>
          <ol className={styles.top5List}>
            {top5Unreliable.map((v) => (
              <li key={v.vendor}>
                <button
                  type="button"
                  className={styles.top5Btn}
                  onClick={() => setDrillVendor(v.vendor)}
                >
                  <span className={styles.top5Name}>{v.vendor}</span>
                  <Sparkline values={sparklineByVendor.get(v.vendor) ?? []} />
                  <span className={styles.top5Meta}>
                    Δ {v.deviationPct >= 0 ? "+" : ""}
                    {v.deviationPct.toFixed(1)} pp
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {top5Unreliable.length === 0 && !loading && (
            <p className={styles.hint}>No PO lines with quantity in sample.</p>
          )}
        </div>
      </Card>

      {drillVendor && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setDrillVendor(null)}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fulfill-variance-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id="fulfill-variance-title" className={styles.modalTitle}>
                <span className={styles.modalTitleText}>{drillVendor} — line variance</span>
                <Sparkline values={sparklineByVendor.get(drillVendor) ?? []} />
              </h3>
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Close"
                onClick={() => setDrillVendor(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalToolbar}>
              <label className={styles.filterCheck}>
                <input
                  type="checkbox"
                  checked={criticalOnly}
                  onChange={(e) => setCriticalOnly(e.target.checked)}
                />
                Critical only (|variance| ≥
                <input
                  type="number"
                  className={styles.thresholdInput}
                  min={0}
                  max={100}
                  value={criticalThreshold}
                  onChange={(e) =>
                    setCriticalThreshold(Number(e.target.value) || CRITICAL_DEFAULT_PCT)
                  }
                />
                %)
              </label>
            </div>
            <div className={styles.tableWrap}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>PO number</TableHeaderCell>
                    <TableHeaderCell>Item</TableHeaderCell>
                    <TableHeaderCell className={styles.thNum}>Ordered</TableHeaderCell>
                    <TableHeaderCell className={styles.thNum}>Shipped / received</TableHeaderCell>
                    <TableHeaderCell className={styles.thNum}>Variance %</TableHeaderCell>
                    <TableHeaderCell className={styles.thNum}>Impact (USD)</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Reason code</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drillRows.map((row) => {
                    const rk = lineKey(row.intakeId, row.itemId);
                    return (
                      <TableRow key={rk}>
                        <TableCell>
                          <Link
                            href={`/dashboard/po/${row.intakeId}`}
                            className={styles.poLink}
                          >
                            {row.poNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{row.itemDescription}</TableCell>
                        <TableCell className={styles.tdNum}>
                          {row.orderedQty.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className={styles.tdNum}>
                          {row.shippedQty.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className={styles.tdNum}>
                          {row.variancePct != null ? pctFmt(row.variancePct) : "—"}
                        </TableCell>
                        <TableCell className={styles.tdNum}>{impactUsd(row)}</TableCell>
                        <TableCell>
                          <StatusCell variancePct={row.variancePct} />
                        </TableCell>
                        <TableCell>
                          <select
                            className={styles.reasonSelect}
                            value={reasonMap[rk] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              saveReason(rk, v);
                              setReasonMap((prev) => {
                                const next = { ...prev };
                                if (!v) delete next[rk];
                                else next[rk] = v;
                                return next;
                              });
                            }}
                          >
                            {REASON_OPTIONS.map((opt) => (
                              <option key={opt || "empty"} value={opt}>
                                {opt || "— Select reason —"}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {drillRows.length === 0 && (
                <p className={styles.emptyHint}>
                  No lines match this filter for this vendor.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
