"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createImportTransaction } from "@/services/import-transactions-service";
import { Card } from "@/components/cards";
import { Input, Button } from "@/components/forms";
import { PageHeader } from "@/components/navigation";
import { isApiError } from "@/types/api";
import type { CreateImportTransactionPayload } from "@/types/import-transactions";
import styles from "./CreateImportTransaction.module.css";

const INITIAL: CreateImportTransactionPayload = {
  po_number: "",
  purchase_request_number: "",
  item_name: "",
  item_category: "",
  supplier_name: "",
  supplier_country: "",
  incoterm: "",
  currency: "USD",
  estimated_value: undefined,
  origin_port_code: "",
  origin_port_name: "",
  destination_port_code: "",
  destination_port_name: "",
  eta: "",
  remarks: "",
};

export function CreateImportTransaction() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [form, setForm] = useState<CreateImportTransactionPayload>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update(field: keyof CreateImportTransactionPayload, value: string | number | undefined) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.po_number?.trim()) next.po_number = "PO number is required.";
    if (!form.supplier_name?.trim()) next.supplier_name = "Supplier name is required.";
    if (!form.origin_port_code?.trim()) next.origin_port_code = "Origin port code is required.";
    if (!form.destination_port_code?.trim())
      next.destination_port_code = "Destination port code is required.";
    if (
      form.estimated_value != null &&
      (Number.isNaN(Number(form.estimated_value)) || Number(form.estimated_value) < 0)
    ) {
      next.estimated_value = "Must be a number ≥ 0.";
    }
    if (form.eta && !/^\d{4}-\d{2}-\d{2}$/.test(String(form.eta).trim())) {
      next.eta = "Use YYYY-MM-DD format.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate() || !accessToken) return;
    setSubmitting(true);
    const payload: CreateImportTransactionPayload = {
      po_number: form.po_number.trim(),
      supplier_name: form.supplier_name.trim(),
      origin_port_code: form.origin_port_code.trim(),
      destination_port_code: form.destination_port_code.trim(),
    };
    if (form.purchase_request_number?.trim())
      payload.purchase_request_number = form.purchase_request_number.trim();
    if (form.item_name?.trim()) payload.item_name = form.item_name.trim();
    if (form.item_category?.trim()) payload.item_category = form.item_category.trim();
    if (form.supplier_country?.trim()) payload.supplier_country = form.supplier_country.trim();
    if (form.incoterm?.trim()) payload.incoterm = form.incoterm.trim();
    if (form.currency?.trim()) payload.currency = form.currency.trim();
    if (form.estimated_value != null)
      payload.estimated_value = Number(form.estimated_value);
    if (form.origin_port_name?.trim()) payload.origin_port_name = form.origin_port_name.trim();
    if (form.destination_port_name?.trim())
      payload.destination_port_name = form.destination_port_name.trim();
    if (form.eta?.trim()) payload.eta = form.eta.trim();
    if (form.remarks?.trim()) payload.remarks = form.remarks.trim();

    createImportTransaction(payload, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setSubmitError(res.message);
          if (res.errors?.length) {
            const byField: Record<string, string> = {};
            res.errors.forEach((err: { field?: string; message?: string }) => {
              if (err.field) byField[err.field] = err.message ?? "";
            });
            setErrors((prev) => ({ ...prev, ...byField }));
          }
          return;
        }
        router.push(`/dashboard/import-transactions/${res.data.id}`);
      })
      .catch(() => setSubmitError("Failed to create transaction"))
      .finally(() => setSubmitting(false));
  }

  return (
    <section>
      <PageHeader
        title="Create import transaction"
        backHref="/dashboard/import-transactions"
        backLabel="Import transactions"
      />

      <form onSubmit={handleSubmit}>
        {submitError && <p className={styles.submitError}>{submitError}</p>}

        <Card title="Basic information" className={styles.card}>
          <div className={styles.grid}>
            <Input
              label="PO number"
              value={form.po_number}
              onChange={(e) => update("po_number", e.target.value)}
              placeholder="e.g. PO-2026-0001"
              required
              error={errors.po_number}
            />
            <Input
              label="Purchase request number"
              value={form.purchase_request_number ?? ""}
              onChange={(e) => update("purchase_request_number", e.target.value)}
              placeholder="e.g. PR-2026-0008"
            />
            <Input
              label="Item name"
              value={form.item_name ?? ""}
              onChange={(e) => update("item_name", e.target.value)}
              placeholder="e.g. Industrial Pump"
            />
            <Input
              label="Item category"
              value={form.item_category ?? ""}
              onChange={(e) => update("item_category", e.target.value)}
              placeholder="e.g. Machinery"
            />
          </div>
        </Card>

        <Card title="Supplier & value" className={styles.card}>
          <div className={styles.grid}>
            <Input
              label="Supplier name"
              value={form.supplier_name}
              onChange={(e) => update("supplier_name", e.target.value)}
              placeholder="e.g. Global Parts Ltd"
              required
              error={errors.supplier_name}
            />
            <Input
              label="Supplier country"
              value={form.supplier_country ?? ""}
              onChange={(e) => update("supplier_country", e.target.value)}
              placeholder="e.g. China"
            />
            <Input
              label="Incoterm"
              value={form.incoterm ?? ""}
              onChange={(e) => update("incoterm", e.target.value)}
              placeholder="e.g. FOB"
            />
            <Input
              label="Currency"
              value={form.currency ?? ""}
              onChange={(e) => update("currency", e.target.value)}
              placeholder="USD"
            />
            <Input
              label="Estimated value"
              type="number"
              min={0}
              value={form.estimated_value ?? ""}
              onChange={(e) =>
                update("estimated_value", e.target.value === "" ? undefined : Number(e.target.value))
              }
              placeholder="e.g. 25000"
              error={errors.estimated_value}
            />
          </div>
        </Card>

        <Card title="Ports & ETA" className={styles.card}>
          <div className={styles.grid}>
            <Input
              label="Origin port code"
              value={form.origin_port_code}
              onChange={(e) => update("origin_port_code", e.target.value)}
              placeholder="e.g. CNSHA"
              required
              error={errors.origin_port_code}
            />
            <Input
              label="Origin port name"
              value={form.origin_port_name ?? ""}
              onChange={(e) => update("origin_port_name", e.target.value)}
              placeholder="e.g. Shanghai Port"
            />
            <Input
              label="Destination port code"
              value={form.destination_port_code}
              onChange={(e) => update("destination_port_code", e.target.value)}
              placeholder="e.g. IDJKT"
              required
              error={errors.destination_port_code}
            />
            <Input
              label="Destination port name"
              value={form.destination_port_name ?? ""}
              onChange={(e) => update("destination_port_name", e.target.value)}
              placeholder="e.g. Jakarta Port"
            />
            <Input
              label="ETA"
              type="date"
              value={form.eta ?? ""}
              onChange={(e) => update("eta", e.target.value)}
              error={errors.eta}
            />
          </div>
        </Card>

        <Card title="Remarks" className={styles.card}>
          <label className={styles.label}>
            Remarks
            <textarea
              value={form.remarks ?? ""}
              onChange={(e) => update("remarks", e.target.value)}
              placeholder="Optional notes"
              rows={3}
              className={styles.textarea}
            />
          </label>
        </Card>

        <div className={styles.actions}>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create transaction"}
          </Button>
          <Link href="/dashboard/import-transactions" className={styles.cancelLink}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
