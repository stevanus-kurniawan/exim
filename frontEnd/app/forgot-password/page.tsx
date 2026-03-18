import { Suspense } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main aria-label="Forgot password">
      <Suspense fallback={<p className="utilLoadingFallback">Loading…</p>}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
