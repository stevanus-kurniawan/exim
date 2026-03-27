"use client";

import { AuthProvider as AuthProviderInner } from "@/hooks/use-auth";
import { ToastProvider } from "./ToastProvider";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviderInner>
      <ToastProvider>{children}</ToastProvider>
    </AuthProviderInner>
  );
}
