"use client";

import Link from "next/link";
import { useState } from "react";
import { Input, Button } from "@/components/forms";
import { forgotPassword as forgotPasswordApi } from "@/services/auth-service";
import { isApiError } from "@/types/api";
import styles from "./ForgotPasswordForm.module.css";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await forgotPasswordApi(email);
      if (isApiError(res)) {
        setError(res.message ?? "Request failed");
        if (res.errors?.length) {
          const byField: Record<string, string> = {};
          for (const { field, message } of res.errors) byField[field] = message;
          setFieldErrors(byField);
        }
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            If an account exists for <strong>{email}</strong>, you will receive a link to reset your password. The link expires in 1 hour.
          </p>
          <p className={styles.footer}>
            <Link href="/login" className={styles.backLink}>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Forgot password</h1>
        <p className={styles.subtitle}>Enter your email and we’ll send you a link to reset your password.</p>
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
          <Button type="submit" fullWidth disabled={loading} className={styles.submit}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <p className={styles.footer}>
          <Link href="/login" className={styles.backLink}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
