"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { verifyEmail as verifyEmailApi } from "@/services/auth-service";
import { isApiError } from "@/types/api";
import styles from "./VerifyEmailHandler.module.css";

function VerifyEmailHandlerInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification link is missing. Please use the link from your email.");
      return;
    }
    verifyEmailApi(token)
      .then((res) => {
        if (isApiError(res)) {
          setStatus("error");
          setMessage(res.message ?? "Verification failed.");
          return;
        }
        setStatus("success");
        setMessage("Your email has been verified. You can now sign in.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Verification failed. The link may have expired.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Verifying your email</h1>
          <p className={styles.subtitle}>Please wait…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>{status === "success" ? "Email verified" : "Verification failed"}</h1>
        <p className={styles.subtitle}>{message}</p>
        <p className={styles.footer}>
          <Link href="/login" className={styles.backLink}>
            {status === "success" ? "Sign in" : "Back to sign in"}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function VerifyEmailHandler() {
  return (
    <Suspense fallback={<p style={{ padding: "1rem", textAlign: "center" }}>Loading…</p>}>
      <VerifyEmailHandlerInner />
    </Suspense>
  );
}
