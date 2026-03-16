"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getTransactionDetail,
  getTimeline,
  getStatusSummary,
  listDocuments,
  uploadDocument,
  listNotes,
  addNote,
} from "@/services/import-transactions-service";
import { Card } from "@/components/cards";
import { Badge } from "@/components/badges";
import { Timeline } from "@/components/timeline";
import { PageHeader } from "@/components/navigation";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from "@/components/tables";
import { Input, Button } from "@/components/forms";
import { formatDateTime } from "@/lib/format-date";
import { statusToBadgeVariant, formatStatusLabel } from "@/lib/status-badge";
import { isApiError } from "@/types/api";
import type {
  ImportTransactionDetail as DetailType,
  TimelineEntry,
  StatusSummaryData,
  TransactionDocumentListItem,
  TransactionNoteListItem,
} from "@/types/import-transactions";
import styles from "./ImportTransactionDetail.module.css";

export function ImportTransactionDetail({ id }: { id: string }) {
  const { accessToken } = useAuth();
  const [detail, setDetail] = useState<DetailType | null>(null);
  const [statusSummary, setStatusSummary] = useState<StatusSummaryData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [documents, setDocuments] = useState<TransactionDocumentListItem[]>([]);
  const [notes, setNotes] = useState<TransactionNoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploadDocType, setUploadDocType] = useState("");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadVersionLabel, setUploadVersionLabel] = useState<"DRAFT" | "FINAL">("DRAFT");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getTransactionDetail(id, accessToken),
      getStatusSummary(id, accessToken),
      getTimeline(id, accessToken),
      listDocuments(id, accessToken),
      listNotes(id, accessToken),
    ])
      .then(([detailRes, statusRes, timelineRes, docsRes, notesRes]) => {
        if (isApiError(detailRes)) {
          setError(detailRes.message);
          return;
        }
        setDetail(detailRes.data);
        if (!isApiError(statusRes)) setStatusSummary(statusRes.data);
        if (!isApiError(timelineRes)) setTimeline(timelineRes.data);
        if (!isApiError(docsRes)) setDocuments(docsRes.data);
        if (!isApiError(notesRes)) setNotes(notesRes.data);
      })
      .catch(() => setError("Failed to load transaction"))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !uploadFile) {
      setUploadError("Document type, name, version label, and file are required.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    const form = new FormData();
    form.set("document_type", uploadDocType.trim());
    form.set("document_name", uploadDocName.trim());
    form.set("version_label", uploadVersionLabel);
    form.set("file", uploadFile);
    uploadDocument(id, form, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setUploadError(res.message);
          return;
        }
        setUploadDocType("");
        setUploadDocName("");
        setUploadFile(null);
        setUploadError(null);
        load();
      })
      .finally(() => setUploading(false));
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    const note = newNote.trim();
    if (!accessToken || !note) {
      setNoteError("Note is required.");
      return;
    }
    setNoteError(null);
    setSubmittingNote(true);
    addNote(id, note, accessToken)
      .then((res) => {
        if (isApiError(res)) {
          setNoteError(res.message);
          return;
        }
        setNewNote("");
        load();
      })
      .finally(() => setSubmittingNote(false));
  }

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!detail) return null;

  return (
    <section className={styles.section}>
      <PageHeader
        title={detail.transaction_number}
        subtitle={detail.po_number ? `PO ${detail.po_number}` : undefined}
        backHref="/dashboard/import-transactions"
        backLabel="Import transactions"
      />

      <Card title="Transaction summary" className={styles.card}>
        <dl className={styles.dl}>
          <div className={styles.row}>
            <dt className={styles.dt}>Transaction #</dt>
            <dd className={styles.dd}>{detail.transaction_number}</dd>
          </div>
          {detail.po_number != null && (
            <div className={styles.row}>
              <dt className={styles.dt}>PO number</dt>
              <dd className={styles.dd}>{detail.po_number}</dd>
            </div>
          )}
          {detail.supplier_name != null && (
            <div className={styles.row}>
              <dt className={styles.dt}>Supplier</dt>
              <dd className={styles.dd}>{detail.supplier_name}</dd>
            </div>
          )}
          {detail.origin_port_name != null && (
            <div className={styles.row}>
              <dt className={styles.dt}>Origin</dt>
              <dd className={styles.dd}>{detail.origin_port_name}</dd>
            </div>
          )}
          {detail.destination_port_name != null && (
            <div className={styles.row}>
              <dt className={styles.dt}>Destination</dt>
              <dd className={styles.dd}>{detail.destination_port_name}</dd>
            </div>
          )}
          {detail.eta != null && (
            <div className={styles.row}>
              <dt className={styles.dt}>ETA</dt>
              <dd className={styles.dd}>{detail.eta}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Current status & previous status */}
      <Card title="Status" className={styles.card}>
        <div className={styles.statusBlock}>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Current</span>
            <Badge variant={statusToBadgeVariant(detail.current_status)}>
              {formatStatusLabel(detail.current_status)}
            </Badge>
          </div>
          {statusSummary?.previous_status != null && (
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Previous</span>
              <Badge variant="neutral">{formatStatusLabel(statusSummary.previous_status)}</Badge>
            </div>
          )}
          {statusSummary?.last_updated_at && (
            <p className={styles.lastUpdated}>
              Last updated: {formatDateTime(statusSummary.last_updated_at)}
            </p>
          )}
        </div>
      </Card>

      {/* Status timeline */}
      <Card title="Status timeline" className={styles.card}>
        <Timeline items={timeline} formatDate={formatDateTime} formatStatus={formatStatusLabel} />
      </Card>

      {/* Document list */}
      <Card title="Documents" className={styles.card}>
        {documents.length === 0 ? (
          <p className={styles.empty}>No documents yet.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Version</TableHeaderCell>
                <TableHeaderCell>Uploaded</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.document_id}>
                  <TableCell>{doc.document_name}</TableCell>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">
                      v{doc.latest_version_number} {doc.latest_version_label}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(doc.uploaded_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Upload document */}
      <Card title="Upload document" className={styles.card}>
        <form onSubmit={handleUpload} className={styles.form}>
          {uploadError && <p className={styles.formError}>{uploadError}</p>}
          <Input
            label="Document type"
            value={uploadDocType}
            onChange={(e) => setUploadDocType(e.target.value)}
            placeholder="e.g. Invoice"
            required
          />
          <Input
            label="Document name"
            value={uploadDocName}
            onChange={(e) => setUploadDocName(e.target.value)}
            placeholder="e.g. Invoice_001"
            required
          />
          <label className={styles.label}>
            Version label
            <select
              value={uploadVersionLabel}
              onChange={(e) => setUploadVersionLabel(e.target.value as "DRAFT" | "FINAL")}
              className={styles.select}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="FINAL">FINAL</option>
            </select>
          </label>
          <label className={styles.label}>
            File
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className={styles.fileInput}
              required
            />
          </label>
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </Card>

      {/* Notes */}
      <Card title="Notes" className={styles.card}>
        <form onSubmit={handleAddNote} className={styles.noteForm}>
          {noteError && <p className={styles.formError}>{noteError}</p>}
          <label className={styles.label}>
            Add note
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter a note…"
              rows={3}
              className={styles.textarea}
            />
          </label>
          <Button type="submit" disabled={submittingNote}>
            {submittingNote ? "Adding…" : "Add note"}
          </Button>
        </form>
        {notes.length > 0 ? (
          <ul className={styles.noteList}>
            {notes.map((n) => (
              <li key={n.note_id} className={styles.noteItem}>
                <p className={styles.noteText}>{n.note}</p>
                <span className={styles.noteMeta}>
                  {formatDateTime(n.created_at)} · {n.created_by}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No notes yet.</p>
        )}
      </Card>
    </section>
  );
}
