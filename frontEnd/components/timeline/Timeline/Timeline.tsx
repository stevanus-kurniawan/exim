"use client";

import { formatDateTime } from "@/lib/format-date";
import styles from "./Timeline.module.css";

export type TimelineItemVariant = "complete" | "active" | "next" | "pending";

export interface TimelineItem {
  sequence: number;
  status: string;
  changed_at: string;
  changed_by: string;
  remarks: string | null;
  /** Visual state: complete (done), active (current), next (upcoming), pending (later). */
  variant?: TimelineItemVariant;
  /** Optional legacy prop; timeline colors now come from variant state. */
  statusTone?: unknown;
}

export interface TimelineProps {
  items: TimelineItem[];
  formatStatus?: (status: string) => string;
  formatDate?: (iso: string) => string;
}

const defaultFormatStatus = (status: string) =>
  status.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");

const defaultFormatDate = formatDateTime;

export function Timeline({
  items,
  formatStatus = defaultFormatStatus,
  formatDate = defaultFormatDate,
}: TimelineProps) {
  if (items.length === 0) {
    return <p className={styles.empty}>No timeline entries.</p>;
  }

  return (
    <ol className={styles.list} aria-label="Status timeline">
      {items.map((item) => {
        const variant = item.variant ?? "complete";
        const statusToneClass =
          variant === "active"
            ? styles.statusActive
            : variant === "next"
              ? styles.statusNext
            : variant === "complete"
              ? styles.statusComplete
            : variant === "pending"
              ? styles.statusPending
              : "";
        return (
          <li
            key={`${item.sequence}-${item.changed_at}-${item.status}`}
            className={styles.item}
            data-variant={variant}
          >
            <span
              className={`${styles.marker} ${
                variant === "active"
                  ? styles.markerActive
                  : variant === "next"
                    ? styles.markerNext
                    : variant === "pending"
                      ? styles.markerPending
                      : styles.markerComplete
              }`}
              aria-hidden
            />
            <div className={styles.content}>
              <span className={`${styles.status} ${statusToneClass}`}>{formatStatus(item.status)}</span>
              <span className={styles.meta}>
                {item.changed_at?.trim() || item.changed_by?.trim() ? (
                  <>
                    {item.changed_at?.trim() ? formatDate(item.changed_at) : "—"}
                    {item.changed_by?.trim() ? ` · ${item.changed_by}` : ""}
                  </>
                ) : (
                  "—"
                )}
              </span>
              {item.remarks && <p className={styles.remarks}>{item.remarks}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
