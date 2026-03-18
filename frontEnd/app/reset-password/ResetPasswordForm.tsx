"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Input, Button } from "@/components/forms";
import { resetPassword as resetPasswordApi } from "@/services/auth-service";
import { isApiError } from "@/types/api";
import styles from "./ResetPasswordForm.module.css";

function ResetPasswordFormInner() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const t = token.trim() || tokenFromUrl;
    if (!t) {
      setFieldErrors({ token: "Reset token is required. Use the link from your email." });
      return;
    }
    setLoading(true);
    try {
      const res = await resetPasswordApi({
        token: t,
        new_password: newPassword,
        password_confirmation: passwordConfirmation,
      });
      if (isApiError(res)) {
        setError(res.message ?? "Reset failed");
        if (res.errors?.length) {
          const byField: Record<string, string> = {};
          for (const { field, message } of res.errors) byField[field] = message;
          setFieldErrors(byField);
        }
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Password reset</h1>
          <p className={styles.subtitle}>Your password has been updated. You can now sign in with your new password.</p>
          <p className={styles.footer}>
            <Link href="/login" className={styles.backLink}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Set new password</h1>
        <p className={styles.subtitle}>Enter your new password below. Use the link from your email if you don’t see a token.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {!tokenFromUrl && (
            <Input
              label="Reset token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from email (or use link from email)"
              error={fieldErrors.token}
            />
          )}
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            error={fieldErrors.new_password}
          />
          <Input
            label="Confirm password"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Repeat password"
            error={fieldErrors.password_confirmation}
          />
          <Button type="submit" fullWidth disabled={loading} className={styles.submit}>
            {loading ? "Resetting…" : "Reset password"}
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

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<p className="utilLoadingFallback">Loading…</p>}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
