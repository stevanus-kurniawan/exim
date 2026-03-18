import { Suspense } from "react";
import { VerifyEmailHandler } from "./VerifyEmailHandler";

export default function VerifyEmailPage() {
  return (
    <main aria-label="Verify email">
      <Suspense fallback={<p className="utilLoadingFallback">Verifying…</p>}>
        <VerifyEmailHandler />
      </Suspense>
    </main>
  );
}
