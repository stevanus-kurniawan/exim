"use client";

import Link from "next/link";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  subtitle?: string;
}

export function PageHeader({
  title,
  backHref,
  backLabel = "Back",
  actions,
  subtitle,
}: PageHeaderProps) {
  const showTopRow = backHref || actions;

  return (
    <header className={styles.header}>
      {showTopRow && (
        <div className={styles.topRow}>
          {backHref ? (
            <Link href={backHref} className={styles.backLink}>
              ← {backLabel}
            </Link>
          ) : (
            <span />
          )}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  );
}
