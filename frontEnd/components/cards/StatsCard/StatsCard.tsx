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
  /** Optional percentage change text (e.g. "+12% from last month") */
  change?: string;
  /** Direction for change styling: up = muted, down = accent */
  changeDirection?: "up" | "down";
  /** Optional icon element in top-right of card */
  icon?: React.ReactNode;
}

export function StatsCard({
  label,
  value,
  href,
  change,
  changeDirection = "up",
  icon,
  className = "",
  ...props
}: StatsCardProps) {
  const content = (
    <>
      {icon && <span className={styles.iconSlot} aria-hidden>{icon}</span>}
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {change != null && change !== "" && (
        <span
          className={
            changeDirection === "down" ? `${styles.change} ${styles.changeDown}` : `${styles.change} ${styles.changeUp}`
          }
        >
          {change}
        </span>
      )}
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
