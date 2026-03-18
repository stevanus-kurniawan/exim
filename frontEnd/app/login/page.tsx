import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main aria-label="Log in to EOS">
      <Suspense fallback={<p className="utilLoadingFallback">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
