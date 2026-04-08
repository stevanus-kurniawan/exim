"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTableColumnVisibility, type TableColumnDef } from "@/hooks/use-table-column-visibility";
import { listPo } from "@/services/po-service";
import { Card } from "@/components/cards";
import { LoadingSkeleton } from "@/components/feedback";
import { Badge } from "@/components/badges";
import { PageHeader, ActionBar, EmptyState } from "@/components/navigation";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  TableColumnPicker,
  TableColumnFilterPicker,
} from "@/components/tables";
import { intakeStatusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { formatPoStatusLabel } from "@/lib/po-status-label";
import { isApiError } from "@/types/api";
import { can } from "@/lib/permissions";
import type { PoListItem } from "@/types/po";
import type { ApiSuccess } from "@/types/api";
import { RefreshIcon } from "@/components/icons/RefreshIcon";
import styles from "./PoList.module.css";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const PO_LIST_TABLE_COLUMNS_KEY = "eos.dash.poList.tableColumns.v3";

/** All scalar PO detail fields (lines / linked shipments are not columns). */
const PO_TABLE_COLUMNS: TableColumnDef[] = [
  { id: "po_number", label: "PO number", locked: true },
  { id: "external_id", label: "External ID" },
  { id: "pt", label: "PT" },
  { id: "plant", label: "Plant" },
  { id: "supplier", label: "Supplier" },
  { id: "delivery_location", label: "Delivery location" },
  { id: "incoterm_location", label: "Incoterms" },
  { id: "kawasan_berikat", label: "Kawasan berikat" },
  { id: "currency", label: "Currency" },
  { id: "intake_status", label: "PO status" },
  { id: "taken_by_user_id", label: "Taken by (user ID)", defaultVisible: false },
  { id: "taken_by_name", label: "Taken by" },
  { id: "taken_at", label: "Taken at" },
  { id: "created_at", label: "Created at" },
  { id: "updated_at", label: "Updated at" },
  { id: "actions", label: "Actions", locked: true },
];

function formatIsoDate(iso: string | null | undefined, dateOnly: boolean): string {
  if (iso == null || String(iso).trim() === "") return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return dateOnly ? d.toLocaleDateString() : d.toLocaleString();
  } catch {
    return "—";
  }
}

export function PoList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFromUrl = searchParams.get("intake_status") ?? undefined;
  const searchFromUrl = searchParams.get("search") ?? "";
  const { accessToken, user } = useAuth();
  const { visibleById, toggleColumn, resetColumns, columns: poColumnDefs } = useTableColumnVisibility(
    PO_LIST_TABLE_COLUMNS_KEY,
    PO_TABLE_COLUMNS
  );
  const [items, setItems] = useState<PoListItem[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [searchInput, setSearchInput] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openFilterColumnId, setOpenFilterColumnId] = useState<string | null>(null);

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
        setItems(
          (success.data ?? []).map((r) => ({
            ...r,
            kawasan_berikat: r.kawasan_berikat ?? null,
            currency: r.currency ?? null,
            taken_by_user_id: r.taken_by_user_id ?? null,
            taken_by_name: r.taken_by_name ?? null,
            updated_at: r.updated_at ?? r.created_at,
          }))
        );
        const m = success.meta as { page: number; limit: number; total: number } | undefined;
        if (m) setMeta(m);
      })
      .catch(() => setError("Failed to load Purchase Order"))
      .finally(() => setLoading(false));
  }, [accessToken, page, searchParam, statusFromUrl]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setSearchInput(searchFromUrl);
    setSearchParam(searchFromUrl);
    setPage(1);
  }, [searchFromUrl]);

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  function handleRowClick(id: string) {
    router.push(`/dashboard/po/${id}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchParam(searchInput);
    setPage(1);
  }

  const visiblePoColumns = poColumnDefs.filter((c) => visibleById[c.id] !== false);

  function poCellValueForFilter(columnId: string, row: PoListItem): string {
    switch (columnId) {
      case "po_number":
        return row.po_number ?? "";
      case "external_id":
        return row.external_id ?? "";
      case "pt":
        return row.pt ?? "";
      case "plant":
        return row.plant ?? "";
      case "supplier":
        return row.supplier_name ?? "";
      case "delivery_location":
        return row.delivery_location ?? "";
      case "incoterm_location":
        return row.incoterm_location ?? "";
      case "kawasan_berikat":
        return row.kawasan_berikat ?? "";
      case "currency":
        return row.currency ?? "";
      case "intake_status":
        return formatPoStatusLabel(row.intake_status);
      case "taken_by_user_id":
        return row.taken_by_user_id ?? "";
      case "taken_by_name":
        return row.taken_by_name ?? "";
      case "taken_at":
        return formatIsoDate(row.taken_at, false);
      case "created_at":
        return formatIsoDate(row.created_at, true);
      case "updated_at":
        return formatIsoDate(row.updated_at, false);
      default:
        return "";
    }
  }

  const columnFilterOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const col of PO_TABLE_COLUMNS) {
      if (col.id === "actions") continue;
      const set = new Set<string>();
      for (const row of items) {
        const v = poCellValueForFilter(col.id, row).trim();
        set.add(v === "" ? "—" : v);
      }
      out[col.id] = Array.from(set).sort((a, b) => a.localeCompare(b));
    }
    return out;
  }, [items]);

  const filteredItems = useMemo(() => {
    const active = Object.entries(columnFilters).filter(([, v]) => Array.isArray(v) && v.length > 0);
    if (active.length === 0) return items;
    return items.filter((row) => {
      return active.every(([colId, selected]) => {
        const v = poCellValueForFilter(colId, row).trim();
        const normalized = v === "" ? "—" : v;
        return selected.includes(normalized);
      });
    });
  }, [items, columnFilters]);

  function renderPoRowCell(column: TableColumnDef, row: PoListItem) {
    switch (column.id) {
      case "po_number":
        return (
          <TableCell key={column.id}>
            <Link href={`/dashboard/po/${row.id}`} className={styles.cellLink} onClick={(e) => e.stopPropagation()}>
              {row.po_number}
            </Link>
          </TableCell>
        );
      case "pt":
        return <TableCell key={column.id}>{row.pt ?? "—"}</TableCell>;
      case "plant":
        return <TableCell key={column.id}>{row.plant ?? "—"}</TableCell>;
      case "supplier":
        return <TableCell key={column.id}>{row.supplier_name ?? "—"}</TableCell>;
      case "external_id":
        return <TableCell key={column.id}>{row.external_id?.trim() || "—"}</TableCell>;
      case "delivery_location":
        return <TableCell key={column.id}>{row.delivery_location?.trim() || "—"}</TableCell>;
      case "incoterm_location":
        return <TableCell key={column.id}>{row.incoterm_location?.trim() || "—"}</TableCell>;
      case "kawasan_berikat":
        return <TableCell key={column.id}>{row.kawasan_berikat?.trim() || "—"}</TableCell>;
      case "currency":
        return <TableCell key={column.id}>{row.currency?.trim() || "—"}</TableCell>;
      case "taken_by_user_id":
        return <TableCell key={column.id}>{row.taken_by_user_id?.trim() || "—"}</TableCell>;
      case "taken_by_name":
        return <TableCell key={column.id}>{row.taken_by_name?.trim() || "—"}</TableCell>;
      case "taken_at":
        return <TableCell key={column.id}>{formatIsoDate(row.taken_at, false)}</TableCell>;
      case "created_at":
        return <TableCell key={column.id}>{formatIsoDate(row.created_at, true)}</TableCell>;
      case "updated_at":
        return <TableCell key={column.id}>{formatIsoDate(row.updated_at, false)}</TableCell>;
      case "intake_status":
        return (
          <TableCell key={column.id}>
            <Badge variant={intakeStatusToBadgeVariant(row.intake_status)}>{formatPoStatusLabel(row.intake_status)}</Badge>
          </TableCell>
        );
      case "actions":
        return (
          <TableCell key={column.id}>
            <div className={styles.actionCell} onClick={(e) => e.stopPropagation()}>
              <Link href={`/dashboard/po/${row.id}`} className={styles.actionBtn}>
                View
              </Link>
              {can(user, "UPDATE_PO_INTAKE") && (
                <Link href={`/dashboard/po/${row.id}/edit`} className={styles.actionBtn}>
                  Edit
                </Link>
              )}
            </div>
          </TableCell>
        );
      default:
        return null;
    }
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
            <button
              type="button"
              className={`${styles.createBtn} ${styles.refreshBtn}`}
              onClick={() => fetchList()}
              disabled={loading}
              aria-label="Refresh list"
            >
              <RefreshIcon className={styles.refreshIcon} />
            </button>
          </div>
        }
      />

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <LoadingSkeleton lines={6} />
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
              <div className={styles.tableToolbar}>
                <button
                  type="button"
                  className={styles.filterClear}
                  onClick={() => setColumnFilters({})}
                  disabled={Object.values(columnFilters).every((v) => !Array.isArray(v) || v.length === 0)}
                >
                  Clear column filters
                </button>
                <TableColumnPicker
                  columns={PO_TABLE_COLUMNS}
                  visibleById={visibleById}
                  onToggle={toggleColumn}
                  onReset={resetColumns}
                />
              </div>
              <Table wrapperClassName={styles.tableFixedHeight}>
                <TableHead>
                  <TableRow>
                    {visiblePoColumns.map((c) => (
                      <TableHeaderCell key={c.id}>
                        <span className={styles.thWithFilter}>
                          <span>{c.label}</span>
                          {c.id !== "actions" && (
                            <TableColumnFilterPicker
                              columnLabel={c.label}
                              options={columnFilterOptions[c.id] ?? []}
                              selected={columnFilters[c.id] ?? []}
                              onChange={(nextSelected) =>
                                setColumnFilters((prev) => ({ ...prev, [c.id]: nextSelected }))
                              }
                              open={openFilterColumnId === c.id}
                              onOpenChange={(open) => setOpenFilterColumnId(open ? c.id : null)}
                            />
                          )}
                        </span>
                      </TableHeaderCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((row) => (
                    <TableRow
                      key={row.id}
                      className={styles.clickableRow}
                      onClick={() => handleRowClick(row.id)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                          e.preventDefault();
                          handleRowClick(row.id);
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open Purchase Order ${row.po_number}`}
                    >
                      {visiblePoColumns.map((c) => renderPoRowCell(c, row))}
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={visiblePoColumns.length}>No rows match current column filters.</TableCell>
                    </TableRow>
                  )}
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
