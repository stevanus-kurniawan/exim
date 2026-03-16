"use client";

import Link from "next/link";
import { useState } from "react";
import { Input, Button } from "@/components/forms";
import { register as registerApi } from "@/services/auth-service";
import { isApiError } from "@/types/api";
import styles from "./RegisterForm.module.css";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
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
      const res = await registerApi({ name, email, password, password_confirmation: passwordConfirmation });
      if (isApiError(res)) {
        setError(res.message ?? "Registration failed");
        if (res.errors?.length) {
          const byField: Record<string, string> = {};
          for (const { field, message } of res.errors) byField[field] = message;
          setFieldErrors(byField);
        }
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
            We sent a verification link to <strong>{email}</strong>. Click the link to verify your account, then you can sign in.
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
        <h1 className={styles.title}>Create an account</h1>
        <p className={styles.subtitle}>Register for EOS — Exim Operation System</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <Input
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Your name"
            error={fieldErrors.name}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@energi-up.com"
            error={fieldErrors.email}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            error={fieldErrors.password}
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
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className={styles.footer}>
          <Link href="/login" className={styles.backLink}>
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
