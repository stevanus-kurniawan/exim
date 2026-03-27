"use client";

/**
 * App layout for protected areas — top header + left sidebar + main content.
 * Sidebar is persistent on desktop; on viewports < 1024px it becomes a drawer toggled by the header menu button.
 */

import { useState, useCallback } from "react";
import { MainLayout } from "./MainLayout";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import styles from "./AppLayout.module.css";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className={styles.wrapper}>
      <Header onMenuClick={openMenu} />
      <div className={styles.body}>
        <Sidebar isMobileOpen={mobileMenuOpen} onClose={closeMenu} />
        {mobileMenuOpen && (
          <div
            className={styles.overlay}
            onClick={closeMenu}
            aria-hidden="true"
          />
        )}
        <MainLayout>{children}</MainLayout>
      </div>
    </div>
  );
}
