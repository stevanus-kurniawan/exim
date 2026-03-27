"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input, Button } from "@/components/forms";
import { DEFAULT_AFTER_LOGIN_PATH } from "@/lib/constants";
import { useToast } from "@/components/providers/ToastProvider";
import styles from "./LoginForm.module.css";

export function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? DEFAULT_AFTER_LOGIN_PATH;
  const { user, initialized, login, loading } = useAuth();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialized && user) {
      window.location.replace(from);
    }
  }, [initialized, user, from]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const result = await login(email, password);
    if (result.ok) {
      pushToast("Signed in successfully.", "success");
      // Full page redirect so the browser sends the new cookies and dashboard loads with auth
      window.location.href = from;
      return;
    }
    const errMsg = result.error ?? "Login failed";
    pushToast(errMsg, "error");
    setError(errMsg);
    if (result.errors?.length) {
      const byField: Record<string, string> = {};
      for (const { field, message } of result.errors) byField[field] = message;
      setFieldErrors(byField);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Log in</h1>
        <p className={styles.subtitle}>Sign in to EOS — Exim Operation System</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            error={fieldErrors.email}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            error={fieldErrors.password}
          />
          <p className={styles.forgotLinkWrap}>
            <Link href="/forgot-password" className={styles.backLink}>
              Forgot password?
            </Link>
          </p>
          <Button type="submit" fullWidth disabled={loading} className={styles.submit}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
