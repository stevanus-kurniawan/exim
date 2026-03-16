"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { listShipments } from "@/services/shipments-service";
import { Card } from "@/components/cards";
import { Badge } from "@/components/badges";
import { PageHeader, ActionBar, EmptyState } from "@/components/navigation";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from "@/components/tables";
import { statusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { isApiError } from "@/types/api";
import type { ShipmentListItem } from "@/types/shipments";
import type { ApiSuccess } from "@/types/api";
import styles from "./ShipmentList.module.css";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export function ShipmentList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFromUrl = searchParams.get("status") ?? undefined;
  const { accessToken } = useAuth();
  const [items, setItems] = useState<ShipmentListItem[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [searchInput, setSearchInput] = useState("");
  const [searchParam, setSearchParam] = useState("");

  const fetchList = useCallback(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listShipments(
      {
        page,
        limit: DEFAULT_LIMIT,
        search: searchParam.trim() || undefined,
        status: statusFromUrl,
      },
      accessToken
    )
      .then((res) => {
        if (isApiError(res)) {
          setError(res.message);
          return;
        }
        const success = res as ApiSuccess<ShipmentListItem[]>;
        setItems(success.data ?? []);
        const m = success.meta as { page: number; limit: number; total: number } | undefined;
        if (m) setMeta(m);
      })
      .catch(() => setError("Failed to load shipments"))
      .finally(() => setLoading(false));
  }, [accessToken, page, searchParam, statusFromUrl]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  function handleRowClick(shipmentId: string) {
    router.push(`/dashboard/shipments/${shipmentId}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchParam(searchInput);
    setPage(1);
  }

  return (
    <section>
      <PageHeader
        title="Shipments"
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <ActionBar
        search={
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <input
              type="search"
              placeholder="Search shipment, supplier…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={styles.searchInput}
              aria-label="Search shipments"
            />
            <button type="submit" className={styles.searchSubmit}>
              Search
            </button>
          </form>
        }
        primaryAction={
          <Link href="/dashboard/shipments" className={styles.createBtn}>
            Refresh
          </Link>
        }
      />

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <Card>
          {items.length === 0 ? (
            <EmptyState
              title="No shipments found"
              description={
                searchParam.trim() || statusFromUrl
                  ? "Try adjusting your search or filter."
                  : "Create a shipment from a PO (Take ownership → Create shipment)."
              }
            />
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Shipment</TableHeaderCell>
                    <TableHeaderCell>Related PO count</TableHeaderCell>
                    <TableHeaderCell>Supplier</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>ETA</TableHeaderCell>
                    <TableHeaderCell>Assigned user</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow
                      key={row.id}
                      className={styles.clickableRow}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRowClick(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick(row.id);
                        }
                      }}
                      aria-label={`View shipment ${row.shipment_number}`}
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/shipments/${row.id}`}
                          className={styles.cellLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.shipment_number}
                        </Link>
                      </TableCell>
                      <TableCell>{row.linked_po_count ?? 0}</TableCell>
                      <TableCell>{row.supplier_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusToBadgeVariant(row.current_status)}>
                          {formatStatusLabel(row.current_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.eta ?? "—"}</TableCell>
                      <TableCell>—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Pagination">
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span className={styles.pageInfo}>
                    Page {page} of {totalPages}
                    {meta && ` (${meta.total} total)`}
                  </span>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </Card>
      )}
    </section>
  );
}
