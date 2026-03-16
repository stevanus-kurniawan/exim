"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import styles from "./Sidebar.module.css";

export interface NavItem {
  href: string;
  label: string;
  comingSoon?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/po", label: "PO" },
  { href: "/dashboard/shipments", label: "Shipments" },
];

const PLACEHOLDER_NAV: NavItem[] = [
  { href: "#", label: "Reports", comingSoon: true },
  { href: "#", label: "Documents", comingSoon: true },
];

function NavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const isPlaceholder = item.comingSoon;

  if (isPlaceholder) {
    return (
      <span className={styles.navItem} aria-disabled="true">
        <span className={styles.navLabel}>{item.label}</span>
        <span className={styles.comingSoon}>Soon</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${styles.navItem} ${isActive ? styles.active : ""}`}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
    >
      <span className={styles.navLabel}>{item.label}</span>
    </Link>
  );
}

export interface SidebarProps {
  /** When true (and viewport is mobile), drawer is visible. */
  isMobileOpen?: boolean;
  /** Called when drawer should close (e.g. overlay click, or after navigation). */
  onClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (isMobileOpen && onClose) onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps -- close drawer on route change

  const drawerOpen = isMobileOpen;
  const asideClass = `${styles.sidebar} ${drawerOpen ? styles.drawerOpen : ""}`;

  return (
    <aside className={asideClass} aria-label="Main navigation">
      <nav className={styles.nav}>
        <ul className={styles.list}>
          {MAIN_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
            return (
              <li key={item.href + item.label}>
                <NavLink item={item} isActive={isActive} onNavigate={onClose} />
              </li>
            );
          })}
        </ul>
        {PLACEHOLDER_NAV.length > 0 && (
          <>
            <div className={styles.divider} />
            <p className={styles.placeholderLabel}>More modules</p>
            <ul className={styles.list}>
              {PLACEHOLDER_NAV.map((item) => (
                <li key={item.label}>
                  <NavLink item={item} isActive={false} />
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
    </aside>
  );
}
