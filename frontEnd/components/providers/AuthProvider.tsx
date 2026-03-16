"use client";

import { AuthProvider as AuthProviderInner } from "@/hooks/use-auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}
