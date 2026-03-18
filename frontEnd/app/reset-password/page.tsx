import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main aria-label="Reset password">
      <Suspense fallback={<p className="utilLoadingFallback">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
