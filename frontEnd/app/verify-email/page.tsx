import { Suspense } from "react";
import { VerifyEmailHandler } from "./VerifyEmailHandler";

export default function VerifyEmailPage() {
  return (
    <main aria-label="Verify email">
      <Suspense fallback={<p style={{ padding: "1rem", textAlign: "center" }}>Verifying…</p>}>
        <VerifyEmailHandler />
      </Suspense>
    </main>
  );
}
