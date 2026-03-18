"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createTestPo } from "@/services/po-service";
import { Card } from "@/components/cards";
import { PageHeader } from "@/components/navigation";
import { Button } from "@/components/forms";
import { formatDecimal, roundTo2Decimals } from "@/lib/format-number";
import { isApiError } from "@/types/api";
import type { CreateTestPoPayload, CreateTestPoItem } from "@/types/po";
import styles from "./CreatePo.module.css";

const UNIT_OPTIONS = ["PCS", "SET", "UNIT", "BOX", "PKG", "KG", "L", "M", "M2", "PAIR", "DOZ", "CTN", "OTH"];
const INCOTERM_OPTIONS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DPU", "DAP", "DDP"];
const CURRENCY_OPTIONS = ["USD", "IDR", "EUR", "GBP", "SGD", "JPY", "CNY", "AUD", "MYR", "THB"];

const initialItem = (): CreateTestPoItem => ({
  item_description: "",
  qty: undefined,
  unit: "PCS",
  value: undefined,
  kurs: undefined,
});

export function CreatePo() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateTestPoPayload & { currency?: string }>({
    external_id: `test-${Date.now()}`,
    po_number: "",
    plant: "",
    supplier_name: "",
    delivery_location: "",
    incoterm_location: "",
    kawasan_berikat: "",
    currency: "USD",
    items: [initialItem()],
  });

  function updateField<K extends keyof CreateTestPoPayload>(field: K, value: string | undefined) {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  function updateItem(index: number, field: keyof CreateTestPoItem, value: string | number | undefined) {
    setForm((prev) => {
      const items = [...(prev.items ?? [])];
      if (!items[index]) items[index] = initialItem();
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...(prev.items ?? []), initialItem()],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => {
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!accessToken) return;

    const payload: CreateTestPoPayload = {
      external_id: form.external_id.trim(),
      po_number: form.po_number.trim(),
      supplier_name: form.supplier_name.trim(),
    };
    if (form.plant?.trim()) payload.plant = form.plant.trim();
    if (form.delivery_location?.trim()) payload.delivery_location = form.delivery_location.trim();
    if (form.incoterm_location?.trim()) payload.incoterm_location = form.incoterm_location.trim();
    if (form.kawasan_berikat?.trim()) payload.kawasan_berikat = form.kawasan_berikat.trim();
    if (form.currency?.trim()) payload.currency = form.currency.trim();

    const validItems = form.items?.filter(
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

    setSubmitting(true);
    createTestPo(payload, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setSubmitError(res.message);
          return;
        }
        const data = res.data as { id?: string };
        if (data?.id) router.push(`/dashboard/po/${data.id}`);
        else router.push("/dashboard/po");
      })
      .finally(() => setSubmitting(false));
  }

  const poCurrency = form.currency || "USD";

  return (
    <section className={styles.section}>
      <PageHeader
        title="Create Purchase Order"
        subtitle="Temporary feature for E2E testing while SaaS integration is not yet available."
        backHref="/dashboard/po"
        backLabel="Purchase Order"
      />

      <form onSubmit={handleSubmit}>
        {submitError && <p className={styles.formError}>{submitError}</p>}

        <Card className={styles.cardSpacing}>
          <h2 className={styles.sectionTitle}>General</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="external_id">External ID *</label>
              <input
                id="external_id"
                type="text"
                className={styles.formInput}
                value={form.external_id}
                onChange={(e) => updateField("external_id", e.target.value)}
                required
                placeholder="e.g. test-123"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="po_number">PO number *</label>
              <input
                id="po_number"
                type="text"
                className={styles.formInput}
                value={form.po_number}
                onChange={(e) => updateField("po_number", e.target.value)}
                required
                placeholder="e.g. PO-2024-001"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="plant">Plant</label>
              <input
                id="plant"
                type="text"
                className={styles.formInput}
                value={form.plant ?? ""}
                onChange={(e) => updateField("plant", e.target.value)}
                placeholder="e.g. PLANT-JKT"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="supplier_name">Supplier name *</label>
              <input
                id="supplier_name"
                type="text"
                className={styles.formInput}
                value={form.supplier_name}
                onChange={(e) => updateField("supplier_name", e.target.value)}
                required
                placeholder="Supplier name"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="delivery_location">Delivery location</label>
              <input
                id="delivery_location"
                type="text"
                className={styles.formInput}
                value={form.delivery_location ?? ""}
                onChange={(e) => updateField("delivery_location", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="incoterm_location">Incoterm</label>
              <select
                id="incoterm_location"
                className={styles.formSelect}
                value={form.incoterm_location ?? ""}
                onChange={(e) => updateField("incoterm_location", e.target.value || undefined)}
                aria-label="Incoterm"
              >
                <option value="">— Select —</option>
                {INCOTERM_OPTIONS.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="currency">Currency (for this PO)</label>
              <select
                id="currency"
                className={styles.formSelect}
                value={form.currency ?? "USD"}
                onChange={(e) => updateField("currency", e.target.value)}
                aria-label="Currency"
              >
                {CURRENCY_OPTIONS.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="kawasan_berikat">Kawasan berikat</label>
              <input
                id="kawasan_berikat"
                type="text"
                className={styles.formInput}
                value={form.kawasan_berikat ?? ""}
                onChange={(e) => updateField("kawasan_berikat", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </Card>

        <Card className={styles.cardSpacing}>
          <h2 className={styles.sectionTitle}>
            Items
            <span className={styles.currencyBadge}>Currency: {poCurrency}</span>
          </h2>
          <p className={styles.itemsHint}>
            Add one or more items. Total value = Qty × Value (read-only). Use the currency above for this PO.
          </p>
          <div className={styles.itemsTableWrap}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th className={styles.itemsTh}>Description</th>
                  <th className={`${styles.itemsTh} ${styles.itemsThCenter}`}>Qty</th>
                  <th className={`${styles.itemsTh} ${styles.itemsThCenter}`}>Unit</th>
                  <th className={`${styles.itemsTh} ${styles.itemsThCenter}`}>Value</th>
                  <th className={`${styles.itemsTh} ${styles.itemsThCenter}`}>Total value</th>
                  <th className={styles.itemsThRemove} aria-label="Remove row" />
                </tr>
              </thead>
              <tbody>
                {(form.items ?? []).map((item, index) => {
                  const total = getItemTotal(item.qty, item.value);
                  return (
                    <tr key={index}>
                      <td className={styles.itemsTd}>
                        <textarea
                          className={styles.itemDescriptionInput}
                          value={item.item_description ?? ""}
                          onChange={(e) => updateItem(index, "item_description", e.target.value)}
                          placeholder="Item description"
                          rows={3}
                          aria-label="Item description"
                        />
                      </td>
                      <td className={`${styles.itemsTd} ${styles.itemsTdCenter}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={styles.itemsInput}
                          value={item.qty ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") updateItem(index, "qty", undefined);
                            else {
                              const n = Number(v);
                              updateItem(index, "qty", Number.isNaN(n) ? undefined : roundTo2Decimals(n));
                            }
                          }}
                          placeholder="0"
                          aria-label="Qty"
                        />
                      </td>
                      <td className={`${styles.itemsTd} ${styles.itemsTdCenter}`}>
                        <select
                          className={styles.itemsSelect}
                          value={item.unit ?? "PCS"}
                          onChange={(e) => updateItem(index, "unit", e.target.value)}
                          aria-label="Unit"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`${styles.itemsTd} ${styles.itemsTdCenter}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={styles.itemsInput}
                          value={item.value ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") updateItem(index, "value", undefined);
                            else {
                              const n = Number(v);
                              updateItem(index, "value", Number.isNaN(n) ? undefined : roundTo2Decimals(n));
                            }
                          }}
                          placeholder="0"
                          aria-label="Value"
                        />
                      </td>
                      <td className={`${styles.itemsTd} ${styles.itemsTdTotal}`}>
                        {total != null ? formatDecimal(total) : "—"}
                      </td>
                      <td className={styles.itemsTdRemove}>
                        <button
                          type="button"
                          className={styles.removeRowBtn}
                          onClick={() => removeItem(index)}
                          disabled={(form.items ?? []).length <= 1}
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
          <button type="button" className={styles.addRowBtn} onClick={addItem}>
            + Add item
          </button>
        </Card>

        <div className={styles.formActions}>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create Purchase Order"}
          </Button>
          <Link href="/dashboard/po">
            <Button type="button" variant="secondary" disabled={submitting}>
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </section>
  );
}
