"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createTestPo } from "@/services/po-service";
import { Card } from "@/components/cards";
import { PageHeader } from "@/components/navigation";
import { Button, ComboboxSelect } from "@/components/forms";
import { useToast } from "@/components/providers/ToastProvider";
import { formatDecimal, formatPriceInputWithCommas, roundTo2Decimals } from "@/lib/format-number";
import { INCOTERM_OPTIONS } from "@/lib/incoterms";
import { PT_OPTION_LABELS, PO_ITEM_UNIT_OPTIONS, getPlantConfigForPt } from "@/lib/po-create-constants";
import { isApiError } from "@/types/api";
import type { CreateTestPoPayload } from "@/types/po";
import styles from "./CreatePo.module.css";

type CreatePoFormState = Omit<CreateTestPoPayload, "external_id" | "items"> & {
  pt: string;
  currency?: string;
  items: ItemFormLine[];
};

/** One line item in the form; qty/price as strings so decimals can be typed (e.g. 1.25). */
type ItemFormLine = {
  item_description: string;
  qtyText: string;
  unit: string;
  priceText: string;
};

const CURRENCY_OPTIONS = ["USD", "IDR", "EUR", "GBP", "SGD", "JPY", "CNY", "AUD", "MYR", "THB"];

const UNIT_OPTIONS: string[] = [...PO_ITEM_UNIT_OPTIONS];
const UNIT_OPTION_SET = new Set<string>(UNIT_OPTIONS);

/** Allow partial decimal input while typing (qty only — no thousands separator). */
const DECIMAL_INPUT_PATTERN = /^\d*\.?\d*$/;

const initialItem = (): ItemFormLine => ({
  item_description: "",
  qtyText: "",
  unit: "PCS",
  priceText: "",
});

function parseOptionalDecimal(text: string): number | undefined {
  const t = text.replace(/,/g, "").trim();
  if (t === "" || t === ".") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function CreatePo() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { pushToast } = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreatePoFormState>({
    pt: "",
    po_number: "",
    plant: "",
    supplier_name: "",
    delivery_location: "",
    incoterm_location: "",
    kawasan_berikat: "",
    currency: "USD",
    items: [initialItem()],
  });

  function updateField<K extends keyof CreatePoFormState>(field: K, value: string | undefined) {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  function handlePtChange(pt: string) {
    const config = getPlantConfigForPt(pt);
    setForm((prev) => {
      let plant = "";
      if (config?.mode === "fixed") plant = config.plant;
      return { ...prev, pt, plant };
    });
  }

  const plantConfig = form.pt ? getPlantConfigForPt(form.pt) : null;

  function updateItem<K extends keyof ItemFormLine>(index: number, field: K, value: ItemFormLine[K]) {
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

  function getItemLineTotal(item: ItemFormLine): number | null {
    const qty = parseOptionalDecimal(item.qtyText);
    const price = parseOptionalDecimal(item.priceText);
    if (qty == null || price == null) return null;
    const n = qty * price;
    return Number.isFinite(n) ? n : null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!accessToken) return;

    if (!form.pt.trim()) {
      setSubmitError("Please select PT.");
      return;
    }
    if (plantConfig?.mode === "select" && !form.plant?.trim()) {
      setSubmitError("Please select Plant.");
      return;
    }
    if (!form.delivery_location?.trim()) {
      setSubmitError("Delivery location is required.");
      return;
    }
    if (form.kawasan_berikat !== "Yes" && form.kawasan_berikat !== "No") {
      setSubmitError("Please select Kawasan berikat (Yes or No).");
      return;
    }

    const validItems = (form.items ?? []).filter(
      (it) =>
        it.item_description?.trim() ||
        it.qtyText.trim() !== "" ||
        it.unit?.trim() ||
        it.priceText.trim() !== ""
    );
    if (validItems.length === 0) {
      setSubmitError("Add at least one line item (e.g. description, quantity, or value).");
      return;
    }

    for (const it of validItems) {
      const u = it.unit?.trim() ?? "";
      if (u && !UNIT_OPTION_SET.has(u)) {
        setSubmitError("Each line unit must be selected from the unit list.");
        return;
      }
    }

    const payload: CreateTestPoPayload = {
      external_id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      po_number: form.po_number.trim(),
      supplier_name: form.supplier_name.trim(),
      delivery_location: form.delivery_location.trim(),
      kawasan_berikat: form.kawasan_berikat,
      pt: form.pt.trim(),
    };
    if (form.plant?.trim()) payload.plant = form.plant.trim();
    if (form.incoterm_location?.trim()) payload.incoterm_location = form.incoterm_location.trim();
    if (form.currency?.trim()) payload.currency = form.currency.trim();

    payload.items = validItems.map((it) => {
      const qty = parseOptionalDecimal(it.qtyText);
      const value = parseOptionalDecimal(it.priceText);
      return {
        item_description: it.item_description?.trim() || undefined,
        qty: qty != null ? roundTo2Decimals(qty) : undefined,
        unit: it.unit?.trim() || undefined,
        value: value != null ? roundTo2Decimals(value) : undefined,
      };
    });

    setSubmitting(true);
    createTestPo(payload, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setSubmitError(res.message);
          pushToast(res.message, "error");
          return;
        }
        pushToast("Purchase Order created.", "success");
        const data = res.data as { id?: string };
        if (data?.id) router.push(`/dashboard/po/${data.id}`);
        else router.push("/dashboard/po");
      })
      .finally(() => setSubmitting(false));
  }

  const poCurrency = form.currency || "USD";

  return (
    <section className={styles.section}>
      <PageHeader title="Create Purchase Order" backHref="/dashboard/po" backLabel="Purchase Order" />

      <form onSubmit={handleSubmit}>
        {submitError && <p className={styles.formError}>{submitError}</p>}

        <Card className={styles.cardSpacing}>
          <h2 className={styles.sectionTitle}>General</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="pt">PT *</label>
              <select
                id="pt"
                className={styles.formSelect}
                value={form.pt}
                onChange={(e) => handlePtChange(e.target.value)}
                required
                aria-label="PT"
              >
                <option value="">— Select PT —</option>
                {PT_OPTION_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="plant">Plant *</label>
              {!form.pt && (
                <input
                  id="plant"
                  type="text"
                  className={styles.formInput}
                  value=""
                  readOnly
                  disabled
                  placeholder="Select PT first"
                  aria-label="Plant"
                />
              )}
              {form.pt && plantConfig?.mode === "fixed" && (
                <input
                  id="plant"
                  type="text"
                  className={styles.formInput}
                  value={plantConfig.plant}
                  readOnly
                  aria-label="Plant"
                />
              )}
              {form.pt && plantConfig?.mode === "select" && (
                <select
                  id="plant"
                  className={styles.formSelect}
                  value={form.plant ?? ""}
                  onChange={(e) => updateField("plant", e.target.value)}
                  required
                  aria-label="Plant"
                >
                  <option value="">— Select plant —</option>
                  {plantConfig.plants.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
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
              <label className={styles.fieldLabel} htmlFor="delivery_location">Delivery location *</label>
              <input
                id="delivery_location"
                type="text"
                className={styles.formInput}
                value={form.delivery_location ?? ""}
                onChange={(e) => updateField("delivery_location", e.target.value)}
                required
                placeholder="Delivery location"
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
              <label className={styles.fieldLabel} htmlFor="kawasan_berikat">Kawasan berikat *</label>
              <select
                id="kawasan_berikat"
                className={styles.formSelect}
                value={form.kawasan_berikat ?? ""}
                onChange={(e) => updateField("kawasan_berikat", e.target.value)}
                required
                aria-label="Kawasan berikat"
              >
                <option value="">— Select —</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className={styles.cardSpacing}>
          <h2 className={styles.sectionTitle}>
            Items
            <span className={styles.currencyBadge}>Currency: {poCurrency}</span>
          </h2>

          <div className={styles.itemsTableWrap}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th className={styles.itemsTh}>Description</th>
                  <th className={`${styles.itemsTh} ${styles.thMetricsGroup}`} colSpan={3}>
                    <div className={styles.metricsHeaderInner}>
                      <span>Qty</span>
                      <span>Unit</span>
                      <span>Price per unit</span>
                    </div>
                  </th>
                  <th className={`${styles.itemsTh} ${styles.itemsThCenter}`}>Total amount</th>
                  <th className={styles.itemsThRemove} aria-label="Remove row" />
                </tr>
              </thead>
              <tbody>
                {(form.items ?? []).map((item, index) => {
                  const total = getItemLineTotal(item);
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
                      <td className={`${styles.itemsTd} ${styles.tdMetricsGroup}`} colSpan={3}>
                        <div className={styles.metricsCluster}>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            className={styles.itemsInput}
                            value={item.qtyText}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || DECIMAL_INPUT_PATTERN.test(v)) {
                                updateItem(index, "qtyText", v);
                              }
                            }}
                            placeholder="0"
                            aria-label="Qty"
                          />
                          <ComboboxSelect
                            className={styles.unitCombobox}
                            inputClassName={`${styles.itemsInput} ${styles.itemsInputDatalist}`}
                            options={UNIT_OPTIONS}
                            value={item.unit ?? ""}
                            onChange={(v) => updateItem(index, "unit", v || "PCS")}
                            allowEmpty={false}
                            placeholder="Type to search…"
                            aria-label="Unit"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            className={styles.itemsInput}
                            value={item.priceText}
                            onChange={(e) =>
                              updateItem(index, "priceText", formatPriceInputWithCommas(e.target.value))
                            }
                            placeholder="1,234.56"
                            aria-label="Price per unit"
                          />
                        </div>
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
