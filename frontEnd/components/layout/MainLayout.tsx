"use client";

/**
 * Reusable main layout — single column, max-width, spacing from design tokens.
 */

import styles from "./MainLayout.module.css";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.main}>{children}</div>;
}
