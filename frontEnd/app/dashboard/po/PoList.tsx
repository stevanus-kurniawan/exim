"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { listPo, createTestPo } from "@/services/po-service";
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
import { Button } from "@/components/forms";
import { intakeStatusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { isApiError } from "@/types/api";
import type { PoListItem, CreateTestPoPayload } from "@/types/po";
import type { ApiSuccess } from "@/types/api";
import styles from "./PoList.module.css";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const UNIT_OPTIONS = ["PCS", "SET", "UNIT", "BOX", "PKG", "KG", "L", "M", "M2", "PAIR", "DOZ", "CTN", "OTH"];

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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateTestPoPayload>({
    external_id: "",
    po_number: "",
    plant: "",
    supplier_name: "",
    delivery_location: "",
    incoterm_location: "",
    kawasan_berikat: "",
    items: [{ item_description: "", qty: undefined, unit: "", value: undefined, kurs: undefined }],
  });

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
      .catch(() => setError("Failed to load PO"))
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

  function openCreateModal() {
    setCreateError(null);
    setCreateForm({
      external_id: `test-${Date.now()}`,
      po_number: "",
      plant: "",
      supplier_name: "",
      delivery_location: "",
      incoterm_location: "",
      kawasan_berikat: "",
      items: [{ item_description: "", qty: undefined, unit: "PCS", value: undefined, kurs: undefined }],
    });
    setCreateModalOpen(true);
  }

  function updateCreateForm(field: keyof CreateTestPoPayload, value: string | undefined) {
    setCreateForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  function updateCreateItem(index: number, field: string, value: string | number | undefined) {
    setCreateForm((prev) => {
      const items = [...(prev.items ?? [])];
      if (!items[index]) items[index] = {};
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  function addItemRow() {
    setCreateForm((prev) => ({
      ...prev,
      items: [...(prev.items ?? []), { item_description: "", qty: undefined, unit: "PCS", value: undefined, kurs: undefined }],
    }));
  }

  function removeItemRow(index: number) {
    setCreateForm((prev) => {
      const items = [...(prev.items ?? [])];
      if (items.length <= 1) return prev;
      items.splice(index, 1);
      return { ...prev, items };
    });
  }

  function getItemTotal(qty: number | undefined, value: number | undefined): number | null {
    if (qty == null || value == null) return null;
    const n = Number(qty) * Number(value);
    return Number.isNaN(n) ? null : n;
  }

  function handleCreateTestPo(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    const payload: CreateTestPoPayload = {
      external_id: createForm.external_id.trim(),
      po_number: createForm.po_number.trim(),
      supplier_name: createForm.supplier_name.trim(),
    };
    if (createForm.plant?.trim()) payload.plant = createForm.plant.trim();
    if (createForm.delivery_location?.trim()) payload.delivery_location = createForm.delivery_location.trim();
    if (createForm.incoterm_location?.trim()) payload.incoterm_location = createForm.incoterm_location.trim();
    if (createForm.kawasan_berikat?.trim()) payload.kawasan_berikat = createForm.kawasan_berikat.trim();
    const validItems = createForm.items?.filter(
      (it) =>
        it.item_description?.trim() || it.qty != null || it.unit?.trim() || it.value != null || it.kurs != null
    );
    if (validItems && validItems.length > 0) {
      payload.items = validItems.map((it) => ({
        item_description: it.item_description?.trim() || undefined,
        qty: it.qty,
        unit: it.unit?.trim() || undefined,
        value: it.value,
        kurs: it.kurs,
      }));
    }
    setCreateError(null);
    setCreateSubmitting(true);
    createTestPo(payload, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setCreateError(res.message);
          return;
        }
        const data = res.data as { id?: string };
        setCreateModalOpen(false);
        fetchList();
        if (data?.id) router.push(`/dashboard/po/${data.id}`);
      })
      .finally(() => setCreateSubmitting(false));
  }

  return (
    <section>
      <PageHeader
        title="PO"
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <ActionBar
        search={
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <input
              type="search"
              placeholder="Search PO number, supplier…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={styles.searchInput}
              aria-label="Search PO"
            />
            <button type="submit" className={styles.searchSubmit}>
              Search
            </button>
          </form>
        }
        primaryAction={
          <div className={styles.primaryActions}>
            <button type="button" className={styles.createBtn} onClick={openCreateModal}>
              Create test PO
            </button>
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
              title="No PO found"
              description={
                searchParam.trim() || statusFromUrl
                  ? "Try adjusting your search or filter."
                  : "New POs from the external system will appear here."
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
                      aria-label={`View PO ${row.po_number}`}
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

      {createModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !createSubmitting && setCreateModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Create test PO</h3>
            <p className={styles.modalSubtitle}>
              Temporary feature for E2E testing while SaaS integration is not yet available.
            </p>
            <form onSubmit={handleCreateTestPo}>
              {createError && <p className={styles.formError}>{createError}</p>}
              <div className={styles.formField}>
                <label className={styles.formLabel}>External ID *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={createForm.external_id}
                  onChange={(e) => updateCreateForm("external_id", e.target.value)}
                  required
                  placeholder="e.g. test-123"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>PO number *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={createForm.po_number}
                  onChange={(e) => updateCreateForm("po_number", e.target.value)}
                  required
                  placeholder="e.g. PO-2024-001"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Plant</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={createForm.plant ?? ""}
                  onChange={(e) => updateCreateForm("plant", e.target.value)}
                  placeholder="e.g. PLANT-JKT"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Supplier name *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={createForm.supplier_name}
                  onChange={(e) => updateCreateForm("supplier_name", e.target.value)}
                  required
                  placeholder="Supplier name"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Delivery location</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={createForm.delivery_location}
                  onChange={(e) => updateCreateForm("delivery_location", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Incoterm location</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={createForm.incoterm_location}
                  onChange={(e) => updateCreateForm("incoterm_location", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Kawasan berikat</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={createForm.kawasan_berikat}
                  onChange={(e) => updateCreateForm("kawasan_berikat", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className={styles.formField}>
                <span className={styles.formLabel}>Items</span>
                <p className={styles.itemsHint}>Add one or more items. Total value = Qty × Value (read-only).</p>
                <div className={styles.itemsTableWrap}>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th className={styles.itemsTh}>Description</th>
                        <th className={styles.itemsTh}>Qty</th>
                        <th className={styles.itemsTh}>Unit</th>
                        <th className={styles.itemsTh}>Value</th>
                        <th className={styles.itemsTh}>Total value</th>
                        <th className={styles.itemsThRemove} aria-label="Remove row" />
                      </tr>
                    </thead>
                    <tbody>
                      {(createForm.items ?? []).map((item, index) => {
                        const total = getItemTotal(item.qty, item.value);
                        return (
                          <tr key={index}>
                            <td className={styles.itemsTd}>
                              <input
                                type="text"
                                className={styles.itemsInput}
                                value={item.item_description ?? ""}
                                onChange={(e) => updateCreateItem(index, "item_description", e.target.value)}
                                placeholder="Item description"
                              />
                            </td>
                            <td className={styles.itemsTd}>
                              <input
                                type="number"
                                className={styles.itemsInput}
                                value={item.qty ?? ""}
                                onChange={(e) =>
                                  updateCreateItem(index, "qty", e.target.value ? Number(e.target.value) : undefined)
                                }
                                placeholder="0"
                                min={0}
                                step="any"
                              />
                            </td>
                            <td className={styles.itemsTd}>
                              <select
                                className={styles.itemsSelect}
                                value={item.unit ?? "PCS"}
                                onChange={(e) => updateCreateItem(index, "unit", e.target.value)}
                                aria-label="Unit"
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className={styles.itemsTd}>
                              <input
                                type="number"
                                className={styles.itemsInput}
                                value={item.value ?? ""}
                                onChange={(e) =>
                                  updateCreateItem(index, "value", e.target.value ? Number(e.target.value) : undefined)
                                }
                                placeholder="0"
                                min={0}
                                step="any"
                              />
                            </td>
                            <td className={styles.itemsTdTotal}>
                              {total != null
                                ? total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                : "—"}
                            </td>
                            <td className={styles.itemsTdRemove}>
                              <button
                                type="button"
                                className={styles.removeRowBtn}
                                onClick={() => removeItemRow(index)}
                                disabled={(createForm.items ?? []).length <= 1}
                                aria-label="Remove item row"
                                title="Remove row"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button type="button" className={styles.addRowBtn} onClick={addItemRow}>
                  + Add item
                </button>
              </div>
              <div className={styles.modalActions}>
                <Button type="submit" variant="primary" disabled={createSubmitting}>
                  {createSubmitting ? "Creating…" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
