"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/navigation";
import { Card } from "@/components/cards";
import { LoadingSkeleton } from "@/components/feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/tables";
import { getProductSpecificationSummary } from "@/services/dashboard-service";
import { isApiError, type ApiSuccess } from "@/types/api";
import type { ProductSpecificationSummaryItem } from "@/types/dashboard";
import styles from "./ManagementDashboard.module.css";

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

export function ManagementDashboard() {
  const { accessToken } = useAuth();
  const [month, setMonth] = useState<number>(currentMonth());
  const [year, setYear] = useState<number>(currentYear());
  const [items, setItems] = useState<ProductSpecificationSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const years = useMemo(() => {
    const now = currentYear();
    const list: number[] = [];
    for (let y = now - 5; y <= now + 1; y++) list.push(y);
    return list;
  }, []);

  const fetchData = useCallback(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getProductSpecificationSummary({ month, year }, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setError(res.message);
          return;
        }
        const success = res as ApiSuccess<ProductSpecificationSummaryItem[]>;
        setItems(success.data ?? []);
      })
      .catch(() => setError("Failed to load management dashboard data"))
      .finally(() => setLoading(false));
  }, [accessToken, month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <section>
      <PageHeader
        title="Management Dashboard"
        subtitle="Delivered quantity grouped by product specification, vendor, PT, and plant"
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <div className={styles.filters}>
        <label className={styles.field}>
          <span>Month</span>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Year</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <LoadingSkeleton lines={6} />
      ) : (
        <Card>
          {items.length === 0 ? (
            <EmptyState
              title="No delivered items found"
              description="Try changing month or year filters."
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Product specification</TableHeaderCell>
                  <TableHeaderCell>Vendor name</TableHeaderCell>
                  <TableHeaderCell>PT</TableHeaderCell>
                  <TableHeaderCell>Plant</TableHeaderCell>
                  <TableHeaderCell>Delivered qty</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row, idx) => (
                  <TableRow key={`${row.product_specification}-${row.vendor_name ?? "na"}-${row.pt ?? "na"}-${row.plant ?? "na"}-${idx}`}>
                    <TableCell>{row.product_specification}</TableCell>
                    <TableCell>{row.vendor_name ?? "—"}</TableCell>
                    <TableCell>{row.pt ?? "—"}</TableCell>
                    <TableCell>{row.plant ?? "—"}</TableCell>
                    <TableCell>{numberFmt(row.delivered_qty)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </section>
  );
}
