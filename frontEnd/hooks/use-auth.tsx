"use client";

/**
 * Auth state handling — login, logout, refresh, user. Tokens in cookies for middleware; state for UI.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as authLogin, logout as authLogout, refresh as authRefresh } from "@/services/auth-service";
import type { AuthUser, LoginResponseData } from "@/types/auth";
import { isApiError } from "@/types/api";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/lib/cookies";

function normalizeAuthUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  return {
    id: o.id,
    name: typeof o.name === "string" ? o.name : "",
    email: typeof o.email === "string" ? o.email : "",
    role: typeof o.role === "string" ? o.role : "VIEWER",
    permission_overrides: Array.isArray(o.permission_overrides)
      ? o.permission_overrides.filter((x): x is string => typeof x === "string")
      : [],
    effective_permissions: Array.isArray(o.effective_permissions)
      ? o.effective_permissions.filter((x): x is string => typeof x === "string")
      : [],
  };
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; errors?: { field: string; message: string }[] }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
    initialized: false,
  });

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refresh = getRefreshToken();
    if (!refresh) {
      setState((s) => ({ ...s, user: null, accessToken: null, loading: false, initialized: true }));
      return false;
    }
    const res = await authRefresh(refresh);
    if (isApiError(res) || !res.data) {
      clearTokens();
      setState((s) => ({ ...s, user: null, accessToken: null, loading: false, initialized: true }));
      return false;
    }
    setTokens(res.data.access_token, res.data.refresh_token, res.data.expires_in);
    let nextUser = normalizeAuthUser(res.data.user);
    if (!nextUser) {
      const me = await getMe(res.data.access_token);
      if (!isApiError(me) && me.data) nextUser = normalizeAuthUser(me.data);
    }
    if (!nextUser) {
      clearTokens();
      setState((s) => ({ ...s, user: null, accessToken: null, loading: false, initialized: true }));
      return false;
    }
    setState((s) => ({
      ...s,
      user: nextUser,
      accessToken: res.data!.access_token,
      loading: false,
      initialized: true,
    }));
    return true;
  }, []);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) {
      setState((s) => ({ ...s, loading: false, initialized: true }));
      return;
    }
    getMe(access)
      .then((res) => {
        if (isApiError(res) || !res.data) {
          refreshSession();
          return;
        }
        setState((s) => ({
          ...s,
          user: res.data as AuthUser,
          accessToken: access,
          loading: false,
          initialized: true,
        }));
      })
      .catch(() => refreshSession());
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string; errors?: { field: string; message: string }[] }> => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const res = await authLogin(email, password);
        if (isApiError(res)) {
          setState((s) => ({ ...s, loading: false }));
          return { ok: false, error: res.message, errors: res.errors };
        }
        const data = res.data as LoginResponseData;
        const nu = normalizeAuthUser(data.user);
        if (!nu) {
          setState((s) => ({ ...s, loading: false }));
          return { ok: false, error: "Invalid user payload from server" };
        }
        setTokens(data.access_token, data.refresh_token, data.expires_in);
        setState((s) => ({
          ...s,
          user: nu,
          accessToken: data.access_token,
          loading: false,
          initialized: true,
        }));
        return { ok: true };
      } catch (err) {
        setState((s) => ({ ...s, loading: false }));
        return { ok: false, error: err instanceof Error ? err.message : "Login failed" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) await authLogout(refresh).catch(() => {});
    clearTokens();
    setState((s) => ({ ...s, user: null, accessToken: null }));
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refreshSession,
    }),
    [state, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
