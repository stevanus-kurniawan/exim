"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { can } from "@/lib/permissions";
import styles from "./Sidebar.module.css";

export interface NavItem {
  href: string;
  label: string;
  comingSoon?: boolean;
}

const BASE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/po", label: "Purchase Order" },
  { href: "/dashboard/shipments", label: "Shipments" },
];

const MANAGE_USERS = "MANAGE_USERS";
const IMPORT_PO_CSV = "IMPORT_PO_CSV";

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
  const { user } = useAuth();

  const mainNav = useMemo(() => {
    const items = [...BASE_NAV];
    if (can(user, IMPORT_PO_CSV)) {
      items.push({ href: "/dashboard/monitoring-data", label: "Monitoring Data" });
    }
    if (can(user, MANAGE_USERS)) {
      items.push({ href: "/dashboard/users", label: "User management" });
    }
    return items;
  }, [user]);

  useEffect(() => {
    if (isMobileOpen && onClose) onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps -- close drawer on route change

  const drawerOpen = isMobileOpen;
  const asideClass = `${styles.sidebar} ${drawerOpen ? styles.drawerOpen : ""}`;

  return (
    <aside className={asideClass} aria-label="Main navigation">
      <nav className={styles.nav}>
        <ul className={styles.list}>
          {mainNav.map((item) => {
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
