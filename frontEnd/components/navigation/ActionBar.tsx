"use client";

import styles from "./ActionBar.module.css";

export interface ActionBarProps {
  /** Search input (controlled by parent) */
  search?: React.ReactNode;
  /** Filter placeholder or filter UI */
  filters?: React.ReactNode;
  /** Primary action (e.g. Create button) */
  primaryAction?: React.ReactNode;
  /** Extra actions on the right */
  children?: React.ReactNode;
}

export function ActionBar({ search, filters, primaryAction, children }: ActionBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {search && <div className={styles.searchSlot}>{search}</div>}
        {filters != null && <div className={styles.filtersSlot}>{filters}</div>}
      </div>
      <div className={styles.right}>
        {primaryAction}
        {children}
      </div>
    </div>
  );
}
