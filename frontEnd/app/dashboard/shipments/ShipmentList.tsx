"use client";

import { Fragment, useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTableColumnVisibility, type TableColumnDef } from "@/hooks/use-table-column-visibility";
import { listShipments } from "@/services/shipments-service";
import { Card } from "@/components/cards";
import { LoadingSkeleton } from "@/components/feedback";
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
import { isApiError } from "@/types/api";
import { displayPibTypeLabel } from "@/lib/pib-type-label";
import type { ShipmentListItem, ShipmentListLinkedPo } from "@/types/shipments";
import { formatDayMonthYear } from "@/lib/format-date";
import type { ApiSuccess } from "@/types/api";
import styles from "./ShipmentList.module.css";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const SHIPMENT_LIST_TABLE_COLUMNS_KEY = "eos.dash.shipmentList.tableColumns.v2";

const SHIPMENT_TABLE_COLUMNS: TableColumnDef[] = [
  { id: "shipment", label: "Shipment", locked: true },
  { id: "pt", label: "PT" },
  { id: "plant", label: "Plant" },
  { id: "po_number", label: "PO number" },
  { id: "vendor", label: "Vendor" },
  { id: "incoterm", label: "Incoterms" },
  { id: "pib_type", label: "PIB type" },
  { id: "shipment_method", label: "Shipment method" },
  { id: "ship_via", label: "Ship via" },
  { id: "product_classification", label: "Product classification" },
  { id: "ship_by", label: "Ship by" },
  { id: "pic", label: "PIC" },
  { id: "forwarder", label: "Forwarder" },
  { id: "etd", label: "ETD" },
  { id: "eta", label: "ETA" },
  { id: "origin_port", label: "Origin port" },
  { id: "destination_port", label: "Destination port" },
];

function displayScheduleDate(iso: string | null | undefined): string {
  return formatDayMonthYear(iso);
}

function formatLineQty(q: number | string | null | undefined): string {
  if (q == null || q === "") return "—";
  if (typeof q === "number") return Number.isInteger(q) ? String(q) : String(q);
  const n = Number(q);
  return Number.isNaN(n) ? String(q) : Number.isInteger(n) ? String(n) : String(n);
}

function normalizeListRow(row: ShipmentListItem): ShipmentListItem {
  const linked = row.linked_pos ?? [];
  const linked_po_count = row.linked_po_count ?? linked.length;
  return {
    ...row,
    linked_pos: linked,
    linked_po_count,
    incoterm: row.incoterm ?? null,
    pib_type: row.pib_type ?? null,
    shipment_method: row.shipment_method ?? null,
    product_classification: row.product_classification ?? null,
    ship_by: row.ship_by ?? null,
  };
}

export function ShipmentList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFromUrl = searchParams.get("status") ?? undefined;
  const searchFromUrl = searchParams.get("search") ?? "";
  const { accessToken } = useAuth();
  const { visibleById, toggleColumn, resetColumns, columns: shipmentColumnDefs } = useTableColumnVisibility(
    SHIPMENT_LIST_TABLE_COLUMNS_KEY,
    SHIPMENT_TABLE_COLUMNS
  );
  const [items, setItems] = useState<ShipmentListItem[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [searchInput, setSearchInput] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [poFromInput, setPoFromInput] = useState("");
  const [poToInput, setPoToInput] = useState("");
  const [poFromParam, setPoFromParam] = useState("");
  const [poToParam, setPoToParam] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openFilterColumnId, setOpenFilterColumnId] = useState<string | null>(null);

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
        po_from_date: poFromParam.trim() || undefined,
        po_to_date: poToParam.trim() || undefined,
      },
      accessToken
    )
      .then((res) => {
        if (isApiError(res)) {
          setError(res.message);
          return;
        }
        const success = res as ApiSuccess<ShipmentListItem[]>;
        const raw = success.data ?? [];
        setItems(raw.map(normalizeListRow));
        const m = success.meta as { page: number; limit: number; total: number } | undefined;
        if (m) setMeta(m);
      })
      .catch(() => setError("Failed to load shipments"))
      .finally(() => setLoading(false));
  }, [accessToken, page, searchParam, statusFromUrl, poFromParam, poToParam]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setSearchInput(searchFromUrl);
    setSearchParam(searchFromUrl);
    setPage(1);
  }, [searchFromUrl]);

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  function handleRowClick(shipmentId: string) {
    router.push(`/dashboard/shipments/${shipmentId}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchParam(searchInput);
    setPage(1);
  }

  function applyPoDateFilter() {
    setPoFromParam(poFromInput);
    setPoToParam(poToInput);
    setPage(1);
  }

  function clearPoDateFilter() {
    setPoFromInput("");
    setPoToInput("");
    setPoFromParam("");
    setPoToParam("");
    setPage(1);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleShipmentColumns = shipmentColumnDefs.filter((c) => visibleById[c.id] !== false);

  function shipmentCellValuesForFilter(columnId: string, row: ShipmentListItem): string[] {
    const linked = row.linked_pos ?? [];
    switch (columnId) {
      case "shipment":
        return [row.shipment_number ?? ""];
      case "pt":
        return [row.display_pt ?? ""];
      case "plant":
        return [row.display_plant ?? ""];
      case "po_number":
        return linked.map((p) => p.po_number);
      case "vendor":
        return [row.vendor_name ?? row.supplier_name ?? ""];
      case "incoterm":
        return [row.incoterm ?? ""];
      case "pib_type":
        return [displayPibTypeLabel(row.pib_type)];
      case "shipment_method":
      case "ship_via":
        return [row.shipment_method ?? ""];
      case "product_classification":
        return [row.product_classification ?? ""];
      case "ship_by":
        return [row.ship_by ?? ""];
      case "pic":
        return [row.pic_name ?? ""];
      case "forwarder":
        return [row.forwarder_name ?? ""];
      case "etd":
        return [displayScheduleDate(row.etd)];
      case "eta":
        return [displayScheduleDate(row.eta)];
      case "origin_port":
        return [row.origin_port_name ?? ""];
      case "destination_port":
        return [row.destination_port_name ?? ""];
      default:
        return [""];
    }
  }

  const columnFilterOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const col of SHIPMENT_TABLE_COLUMNS) {
      const set = new Set<string>();
      for (const row of items) {
        for (const raw of shipmentCellValuesForFilter(col.id, row)) {
          const v = (raw ?? "").trim();
          set.add(v === "" ? "—" : v);
        }
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
        const values = shipmentCellValuesForFilter(colId, row).map((x) => (x ?? "").trim()).map((v) => (v === "" ? "—" : v));
        return values.some((v) => selected.includes(v));
      });
    });
  }, [items, columnFilters]);

  function renderShipmentRowCell(column: TableColumnDef, row: ShipmentListItem) {
    const linked = row.linked_pos ?? [];
    const n = row.linked_po_count ?? linked.length;
    const expanded = expandedIds.has(row.id);
    const vendor = row.vendor_name ?? row.supplier_name;

    switch (column.id) {
      case "shipment":
        return (
          <TableCell key={column.id}>
            <Link
              href={`/dashboard/shipments/${row.id}`}
              className={styles.cellLink}
              onClick={(e) => e.stopPropagation()}
            >
              {row.shipment_number}
            </Link>
          </TableCell>
        );
      case "pt":
        return <TableCell key={column.id}>{row.display_pt?.trim() || "—"}</TableCell>;
      case "plant":
        return <TableCell key={column.id}>{row.display_plant?.trim() || "—"}</TableCell>;
      case "po_number":
        return (
          <TableCell key={column.id} className={styles.poCell}>
            {n === 0 && "—"}
            {n === 1 && (linked[0]?.po_number ?? "—")}
            {n > 1 && (
              <button
                type="button"
                className={styles.poToggle}
                aria-expanded={expanded}
                aria-controls={`shipment-${row.id}-po-panel`}
                id={`shipment-${row.id}-po-trigger`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(row.id);
                }}
              >
                {n} POs
                <span className={styles.poToggleIcon} aria-hidden>
                  {expanded ? " ▴" : " ▾"}
                </span>
              </button>
            )}
          </TableCell>
        );
      case "vendor":
        return <TableCell key={column.id}>{vendor?.trim() || "—"}</TableCell>;
      case "incoterm":
        return <TableCell key={column.id}>{row.incoterm?.trim() || "—"}</TableCell>;
      case "pib_type":
        return <TableCell key={column.id}>{displayPibTypeLabel(row.pib_type)}</TableCell>;
      case "shipment_method":
        return <TableCell key={column.id}>{row.shipment_method?.trim() || "—"}</TableCell>;
      case "ship_via":
        return <TableCell key={column.id}>{row.shipment_method?.trim() || "—"}</TableCell>;
      case "product_classification":
        return <TableCell key={column.id}>{row.product_classification?.trim() || "—"}</TableCell>;
      case "ship_by":
        return <TableCell key={column.id}>{row.ship_by?.trim() || "—"}</TableCell>;
      case "pic":
        return <TableCell key={column.id}>{row.pic_name?.trim() || "—"}</TableCell>;
      case "forwarder":
        return <TableCell key={column.id}>{row.forwarder_name?.trim() || "—"}</TableCell>;
      case "etd":
        return <TableCell key={column.id}>{displayScheduleDate(row.etd)}</TableCell>;
      case "eta":
        return <TableCell key={column.id}>{displayScheduleDate(row.eta)}</TableCell>;
      case "origin_port":
        return <TableCell key={column.id}>{row.origin_port_name?.trim() || "—"}</TableCell>;
      case "destination_port":
        return <TableCell key={column.id}>{row.destination_port_name?.trim() || "—"}</TableCell>;
      default:
        return null;
    }
  }

  function renderPoExpandPanel(pos: ShipmentListLinkedPo[]) {
    return (
      <div className={styles.expandPanel}>
        {pos.map((po) => (
          <div key={po.intake_id} className={styles.expandPoBlock}>
            <div className={styles.expandPoTitle}>
              PO <strong>{po.po_number}</strong>
              {(po.pt || po.plant) && (
                <span className={styles.expandPoMeta}>
                  {[po.pt, po.plant].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            {po.items.length === 0 ? (
              <p className={styles.expandEmptyLines}>No line items on this PO.</p>
            ) : (
              <table className={styles.expandItemsTable}>
                <thead>
                  <tr>
                    <th className={styles.expandTh}>Item description</th>
                    <th className={styles.expandThQty}>Qty PO</th>
                    <th className={styles.expandThQty}>Delivery qty</th>
                    <th className={styles.expandThUnit}>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((it, idx) => (
                    <tr key={`${po.intake_id}-${idx}`}>
                      <td>{it.item_description?.trim() || "—"}</td>
                      <td className={styles.expandTdNum}>{formatLineQty(it.qty_po)}</td>
                      <td className={styles.expandTdNum}>
                        {it.delivery_qty != null && it.delivery_qty !== ""
                          ? formatLineQty(it.delivery_qty)
                          : "—"}
                      </td>
                      <td>{it.unit?.trim() || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <section>
      <PageHeader title="Shipments" backHref="/dashboard" backLabel="Dashboard" />

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
        filters={
          <div className={styles.filterBar}>
            <span className={styles.filterLabel}>PO date</span>
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>From</span>
              <input
                type="date"
                className={styles.dateInput}
                value={poFromInput}
                onChange={(e) => setPoFromInput(e.target.value)}
                aria-label="PO date from"
              />
            </label>
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>To</span>
              <input
                type="date"
                className={styles.dateInput}
                value={poToInput}
                onChange={(e) => setPoToInput(e.target.value)}
                aria-label="PO date to"
              />
            </label>
            <button type="button" className={styles.filterApply} onClick={applyPoDateFilter}>
              Apply
            </button>
            <button type="button" className={styles.filterClear} onClick={clearPoDateFilter}>
              Clear
            </button>
            <span className={styles.filterHint} title="Uses each group PO’s po_date when set; otherwise the PO intake date.">
              Group PO only
            </span>
          </div>
        }
        primaryAction={
          <Link href="/dashboard/shipments" className={styles.createBtn}>
            Refresh
          </Link>
        }
      />

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <LoadingSkeleton lines={6} />
      ) : (
        <Card>
          {items.length === 0 ? (
            <EmptyState
              title="No shipments found"
              description={
                searchParam.trim() || statusFromUrl || poFromParam || poToParam
                  ? "Try adjusting search, PO date, or status."
                  : "Create a shipment from a PO (Take ownership → Create shipment)."
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
                  columns={SHIPMENT_TABLE_COLUMNS}
                  visibleById={visibleById}
                  onToggle={toggleColumn}
                  onReset={resetColumns}
                />
              </div>
              <Table wrapperClassName={styles.tableFixedHeight}>
                <TableHead>
                  <TableRow>
                    {visibleShipmentColumns.map((c) => (
                      <TableHeaderCell key={c.id}>
                        <span className={styles.thWithFilter}>
                          <span>{c.label}</span>
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
                        </span>
                      </TableHeaderCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((row) => {
                    const linked = row.linked_pos ?? [];
                    const n = row.linked_po_count ?? linked.length;
                    const expanded = expandedIds.has(row.id);

                    return (
                      <Fragment key={row.id}>
                        <TableRow
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
                          aria-label={`Open shipment ${row.shipment_number}`}
                        >
                          {visibleShipmentColumns.map((c) => renderShipmentRowCell(c, row))}
                        </TableRow>
                        {n > 1 && expanded && (
                          <TableRow className={styles.expandRow} aria-labelledby={`shipment-${row.id}-po-trigger`}>
                            <TableCell
                              colSpan={visibleShipmentColumns.length}
                              className={styles.expandCell}
                              id={`shipment-${row.id}-po-panel`}
                            >
                              {renderPoExpandPanel(linked)}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={visibleShipmentColumns.length}>No rows match current column filters.</TableCell>
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
