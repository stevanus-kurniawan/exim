"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/providers/ToastProvider";
import { Card } from "@/components/cards";
import { EmptyState, PageHeader } from "@/components/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/tables";
import { LoadingSkeleton } from "@/components/feedback";
import { isApiError } from "@/types/api";
import type { PoImportCsvResult, PoImportHistoryItem } from "@/types/po";
import type { ShipmentImportCsvResult } from "@/types/shipments";
import {
  downloadPoImportTemplate,
  importPoCsv,
  listPoImportHistory,
} from "@/services/po-service";
import {
  downloadShipmentCombinedTemplate,
  importShipmentCombinedCsv,
} from "@/services/shipments-service";
import styles from "./MonitoringDataPage.module.css";

function statusLabel(v: string): string {
  switch (v) {
    case "SUCCESS":
      return "Success";
    case "PARTIAL":
      return "Partial";
    case "FAILED":
      return "Failed";
    default:
      return v;
  }
}

export function MonitoringDataPage() {
  const { accessToken } = useAuth();
  const { pushToast } = useToast();
  const [result, setResult] = useState<PoImportCsvResult | null>(null);
  const [history, setHistory] = useState<PoImportHistoryItem[]>([]);
  const [shipmentResult, setShipmentResult] = useState<ShipmentImportCsvResult | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(() => {
    if (!accessToken) {
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);
    listPoImportHistory(accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setError(res.message);
          return;
        }
        setHistory(res.data ?? []);
      })
      .catch(() => setError("Failed to load import history"))
      .finally(() => setLoadingHistory(false));
  }, [accessToken]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function onTemplateDownload() {
    if (!accessToken) return;
    try {
      const blob = await downloadPoImportTemplate(accessToken);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "monitoring-data-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      pushToast("Failed to download template", "error");
    }
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await importPoCsv(file, accessToken);
    setBusy(false);
    if (isApiError(res)) {
      setError(res.message);
      pushToast(res.message, "error");
      return;
    }
    setResult(res.data);
    const hasError = (res.data.errors?.length ?? 0) > 0;
    pushToast(
      hasError ? "Import completed with row warnings." : "Import completed successfully.",
      hasError ? "info" : "success"
    );
    fetchHistory();
  }

  async function onShipmentTemplateDownload() {
    if (!accessToken) return;
    try {
      const blob = await downloadShipmentCombinedTemplate(accessToken);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "monitoring-data-v2-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      pushToast("Failed to download shipment template", "error");
    }
  }

  async function onShipmentImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;
    setBusy(true);
    setError(null);
    setShipmentResult(null);
    const res = await importShipmentCombinedCsv(file, accessToken);
    setBusy(false);
    if (isApiError(res)) {
      setError(res.message);
      pushToast(res.message, "error");
      return;
    }
    setShipmentResult(res.data);
    const hasError = (res.data.errors?.length ?? 0) > 0;
    pushToast(
      hasError ? "Shipment+PO trial import completed with warnings." : "Shipment+PO trial import successful.",
      hasError ? "info" : "success"
    );
  }

  return (
    <section>
      <PageHeader
        title="Monitoring Data"
        subtitle="Import monitoring Purchase Order data with CSV template"
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <Card className={styles.uploadPanel}>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onTemplateDownload} disabled={busy}>
            Download CSV Template
          </button>
        </div>
        <div className={styles.row}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onImportFile}
            disabled={busy}
            aria-label="Choose CSV file for monitoring import"
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {result && (
          <p className={styles.summary}>
            Total rows: {result.total_rows} | Imported POs: {result.imported_pos} | Imported rows:{" "}
            {result.imported_rows} | Failed rows: {result.failed_rows}
          </p>
        )}
      </Card>

      <Card>
        <h3 className={styles.sectionTitle}>Row-level Validation Errors</h3>
        {!result || result.errors.length === 0 ? (
          <EmptyState
            title="No validation errors"
            description="Upload a CSV file to validate and import monitoring data."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Row</TableHeaderCell>
                <TableHeaderCell>PO Number</TableHeaderCell>
                <TableHeaderCell>Field</TableHeaderCell>
                <TableHeaderCell>Error message</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.errors.map((row) => (
                <TableRow key={`${row.row}-${row.field}-${row.po_number}-${row.message}`}>
                  <TableCell className={styles.smallCell}>{row.row}</TableCell>
                  <TableCell className={styles.smallCell}>{row.po_number || "—"}</TableCell>
                  <TableCell className={styles.smallCell}>{row.field}</TableCell>
                  <TableCell>{row.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <h3 className={styles.sectionTitle}>Shipment + PO Trial (Single CSV)</h3>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onShipmentTemplateDownload} disabled={busy}>
            Download Shipment Trial Template
          </button>
        </div>
        <div className={styles.row}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onShipmentImportFile}
            disabled={busy}
            aria-label="Choose CSV file for shipment and PO trial import"
          />
        </div>
        {shipmentResult && (
          <p className={styles.summary}>
            Total rows: {shipmentResult.total_rows} | Imported shipments: {shipmentResult.imported_shipments} |
            Imported rows: {shipmentResult.imported_rows} | Failed rows: {shipmentResult.failed_rows}
          </p>
        )}
        {!shipmentResult || shipmentResult.errors.length === 0 ? (
          <EmptyState title="No shipment import errors" description="Upload shipment trial CSV to validate results." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Row</TableHeaderCell>
                <TableHeaderCell>Shipment</TableHeaderCell>
                <TableHeaderCell>PO Number</TableHeaderCell>
                <TableHeaderCell>Field</TableHeaderCell>
                <TableHeaderCell>Error message</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shipmentResult.errors.map((row) => (
                <TableRow key={`${row.row}-${row.field}-${row.shipment_no}-${row.po_number}-${row.message}`}>
                  <TableCell className={styles.smallCell}>{row.row}</TableCell>
                  <TableCell className={styles.smallCell}>{row.shipment_no || "—"}</TableCell>
                  <TableCell className={styles.smallCell}>{row.po_number || "—"}</TableCell>
                  <TableCell className={styles.smallCell}>{row.field}</TableCell>
                  <TableCell>{row.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <h3 className={styles.sectionTitle}>Upload History</h3>
        {loadingHistory ? (
          <LoadingSkeleton lines={4} />
        ) : history.length === 0 ? (
          <EmptyState title="No uploads yet" description="Upload history will appear here." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Uploaded at</TableHeaderCell>
                <TableHeaderCell>File name</TableHeaderCell>
                <TableHeaderCell>Uploaded by</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Total rows</TableHeaderCell>
                <TableHeaderCell>Imported rows</TableHeaderCell>
                <TableHeaderCell>Failed rows</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{new Date(h.created_at).toLocaleString()}</TableCell>
                  <TableCell>{h.file_name ?? "—"}</TableCell>
                  <TableCell>{h.uploaded_by}</TableCell>
                  <TableCell>{statusLabel(h.status)}</TableCell>
                  <TableCell>{h.total_rows}</TableCell>
                  <TableCell>{h.imported_rows}</TableCell>
                  <TableCell>{h.failed_rows}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  );
}
