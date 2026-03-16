import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main aria-label="Reset password">
      <Suspense fallback={<p style={{ padding: "1rem", textAlign: "center" }}>Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
