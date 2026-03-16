"use client";

/**
 * API client hook — attaches current access token to requests. Use for authenticated calls.
 */

import { useMemo } from "react";
import { useAuth } from "./use-auth";
import * as api from "@/services/api-client";

export function useApi() {
  const { accessToken } = useAuth();
  return useMemo(
    () => ({
      get: <T>(path: string) => api.apiGet<T>(path, accessToken),
      post: <T>(path: string, body: unknown) => api.apiPost<T>(path, body, accessToken),
      put: <T>(path: string, body: unknown) => api.apiPut<T>(path, body, accessToken),
      patch: <T>(path: string, body: unknown) => api.apiPatch<T>(path, body, accessToken),
      delete: <T>(path: string) => api.apiDelete<T>(path, accessToken),
    }),
    [accessToken]
  );
}
