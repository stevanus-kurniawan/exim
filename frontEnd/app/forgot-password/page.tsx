import { Suspense } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main aria-label="Forgot password">
      <Suspense fallback={<p style={{ padding: "1rem", textAlign: "center" }}>Loading…</p>}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
