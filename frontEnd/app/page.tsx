import Link from "next/link";
import { LOGIN_PATH, DEFAULT_AFTER_LOGIN_PATH } from "@/lib/constants";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Exim Operation System (EOS)</h1>
      <p className={styles.subtitle}>Phase 1 — Import Operation</p>
      <nav className={styles.nav}>
        <Link href={LOGIN_PATH}>Log in</Link>
        <Link href={DEFAULT_AFTER_LOGIN_PATH}>Dashboard</Link>
      </nav>
    </main>
  );
}
