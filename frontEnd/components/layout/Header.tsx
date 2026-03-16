"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LOGIN_PATH } from "@/lib/constants";
import styles from "./Header.module.css";

export interface HeaderProps {
  /** Called when user taps the mobile menu button (only relevant on small viewports). */
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push(LOGIN_PATH);
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuToggle}
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <span className={styles.menuIcon} aria-hidden />
        </button>
        <Link href="/dashboard" className={styles.logo}>
          EOS
        </Link>
      </div>
      <nav className={styles.nav} aria-label="User menu">
        {user && (
          <span className={styles.user}>
            <span className={styles.userName}>{user.name}</span>
            <button type="button" onClick={handleLogout} className={styles.logout}>
              Log out
            </button>
          </span>
        )}
      </nav>
    </header>
  );
}
