"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { listPo } from "@/services/po-service";
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
import { intakeStatusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { isApiError } from "@/types/api";
import type { PoListItem } from "@/types/po";
import type { ApiSuccess } from "@/types/api";
import styles from "./PoList.module.css";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function formatDetectedAt(created_at: string): string {
  try {
    const d = new Date(created_at);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  } catch {
    return "—";
  }
}

export function PoList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFromUrl = searchParams.get("intake_status") ?? undefined;
  const { accessToken } = useAuth();
  const [items, setItems] = useState<PoListItem[]>([]);
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
    listPo(
      {
        page,
        limit: DEFAULT_LIMIT,
        search: searchParam.trim() || undefined,
        intake_status: statusFromUrl,
      },
      accessToken
    )
      .then((res) => {
        if (isApiError(res)) {
          setError(res.message);
          return;
        }
        const success = res as ApiSuccess<PoListItem[]>;
        setItems(success.data ?? []);
        const m = success.meta as { page: number; limit: number; total: number } | undefined;
        if (m) setMeta(m);
      })
      .catch(() => setError("Failed to load Purchase Order"))
      .finally(() => setLoading(false));
  }, [accessToken, page, searchParam, statusFromUrl]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  function handleRowClick(id: string) {
    router.push(`/dashboard/po/${id}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchParam(searchInput);
    setPage(1);
  }

  return (
    <section>
      <PageHeader
        title="Purchase Order"
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <ActionBar
        search={
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <input
              type="search"
              placeholder="Search Purchase Order number, supplier…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={styles.searchInput}
              aria-label="Search Purchase Order"
            />
            <button type="submit" className={styles.searchSubmit}>
              Search
            </button>
          </form>
        }
        primaryAction={
          <div className={styles.primaryActions}>
            <Link href="/dashboard/po/new" className={styles.createBtn}>
              Create Purchase Order
            </Link>
            <Link href="/dashboard/po" className={styles.createBtn}>
              Refresh
            </Link>
          </div>
        }
      />

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <Card>
          {items.length === 0 ? (
            <EmptyState
              title="No Purchase Order found"
              description={
                searchParam.trim() || statusFromUrl
                  ? "Try adjusting your search or filter."
                  : "New Purchase Orders from the external system will appear here."
              }
            />
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>PO number</TableHeaderCell>
                    <TableHeaderCell>Plant</TableHeaderCell>
                    <TableHeaderCell>Supplier</TableHeaderCell>
                    <TableHeaderCell>Incoterms</TableHeaderCell>
                    <TableHeaderCell>Detected at</TableHeaderCell>
                    <TableHeaderCell>Intake status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
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
                      aria-label={`View Purchase Order ${row.po_number}`}
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/po/${row.id}`}
                          className={styles.cellLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.po_number}
                        </Link>
                      </TableCell>
                      <TableCell>{row.plant ?? "—"}</TableCell>
                      <TableCell>{row.supplier_name ?? "—"}</TableCell>
                      <TableCell>{row.incoterm_location ?? "—"}</TableCell>
                      <TableCell>{formatDetectedAt(row.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={intakeStatusToBadgeVariant(row.intake_status)}>
                          {formatStatusLabel(row.intake_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={styles.actionCell} onClick={(e) => e.stopPropagation()}>
                          <Link href={`/dashboard/po/${row.id}`} className={styles.actionBtn}>
                            View
                          </Link>
                        </div>
                      </TableCell>
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
