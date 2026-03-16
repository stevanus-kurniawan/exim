"use client";

import type { HTMLAttributes } from "react";
import styles from "./StatsCard.module.css";

export interface StatsCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Short label above the value (e.g. "New PO detected") */
  label: string;
  /** Metric value (e.g. count) */
  value: string | number;
  /** When set, the card is rendered as a link (for dashboard metric cards). */
  href?: string;
}

export function StatsCard({ label, value, href, className = "", ...props }: StatsCardProps) {
  const content = (
    <>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`${styles.card} ${styles.link} ${className}`}
        {...(props as HTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`${styles.card} ${className}`} {...props}>
      {content}
    </div>
  );
}
