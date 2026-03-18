import { Suspense } from "react";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main aria-label="Register for EOS">
      <Suspense fallback={<p className="utilLoadingFallback">Loading…</p>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
