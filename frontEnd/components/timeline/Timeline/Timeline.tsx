"use client";

import { formatDateTime } from "@/lib/format-date";
import styles from "./Timeline.module.css";

export interface TimelineItem {
  sequence: number;
  status: string;
  changed_at: string;
  changed_by: string;
  remarks: string | null;
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
      {items.map((item, index) => (
        <li key={`${item.sequence}-${item.changed_at}`} className={styles.item}>
          <span className={styles.marker} aria-hidden />
          <div className={styles.content}>
            <span className={styles.status}>{formatStatus(item.status)}</span>
            <span className={styles.meta}>
              {formatDate(item.changed_at)} · {item.changed_by}
            </span>
            {item.remarks && <p className={styles.remarks}>{item.remarks}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
