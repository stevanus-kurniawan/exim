/**
 * API client abstraction — fetch, auth headers, single-flight refresh on 401 (browser).
 */

import { config } from "@/lib/config";
import type { ApiResponse, ApiError } from "@/types/api";
import type { RefreshResponseData } from "@/types/auth";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/lib/cookies";

/**
 * Client: relative `/api/backend/...` is fine. Server (RSC / SSR): must be absolute; defaults to this Next process.
 */
function resolveRequestUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const suffix = path.replace(/^\//, "");
  const rel = `${base}/${suffix}`;
  if (typeof window !== "undefined") {
    return rel.startsWith("/") ? rel : `/${rel}`;
  }
  if (base.startsWith("http")) return rel;
  const origin = process.env.INTERNAL_NEXT_ORIGIN?.trim() || "http://127.0.0.1:3000";
  return `${origin.replace(/\/$/, "")}${rel.startsWith("/") ? rel : `/${rel}`}`;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** If provided, access token is sent as Bearer (browser falls back to cookie when omitted). */
  accessToken?: string | null;
}

function getHeaders(
  accessToken?: string | null,
  customHeaders?: Record<string, string>,
  body?: unknown
): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  if (body != null && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  return headers;
}

function pathKey(path: string): string {
  return path.replace(/^\//, "").split("?")[0];
}

function skipRefreshOn401(path: string): boolean {
  const p = pathKey(path);
  return p === "auth/login" || p === "auth/refresh";
}

/** Prefer explicit token; in browser also use access cookie so callers stay in sync after silent refresh. */
function bearerForRequest(explicit?: string | null): string | null {
  if (explicit) return explicit;
  if (typeof window !== "undefined") return getAccessToken();
  return null;
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Refresh tokens via direct fetch (must not use apiPost — avoids 401 recursion).
 * Dispatches `eos-access-token-refreshed` so AuthProvider can update in-memory access token.
 */
function refreshAccessTokenSingleFlight(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const rt = getRefreshToken();
        if (!rt || typeof window === "undefined") return null;
        const url = resolveRequestUrl("auth/refresh");
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
        const json = (await res.json().catch(() => ({}))) as ApiResponse<RefreshResponseData>;
        if (
          !res.ok ||
          !json ||
          typeof json !== "object" ||
          !("success" in json) ||
          json.success !== true ||
          !json.data?.access_token
        ) {
          clearTokens();
          return null;
        }
        const d = json.data;
        setTokens(d.access_token, d.refresh_token ?? rt, d.expires_in);
        window.dispatchEvent(
          new CustomEvent("eos-access-token-refreshed", { detail: { accessToken: d.access_token } })
        );
        return d.access_token;
      } catch {
        clearTokens();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * Request to API. On non-OK responses returns error body (success: false, message, errors); does not throw.
 * In the browser, on 401 (except auth login/refresh), attempts one silent token refresh and retries.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { accessToken, body, ...init } = options;
  const url = resolveRequestUrl(path);
  const customHeaders =
    init.headers && typeof init.headers === "object" && !Array.isArray(init.headers) && !(init.headers instanceof Headers)
      ? (init.headers as Record<string, string>)
      : undefined;

  let token = bearerForRequest(accessToken);
  const payload =
    body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body);

  async function doFetch(bearer: string | null): Promise<Response> {
    return fetch(url, {
      ...init,
      headers: getHeaders(bearer, customHeaders, body),
      body: payload as RequestInit["body"],
    });
  }

  let res = await doFetch(token);

  if (
    res.status === 401 &&
    !skipRefreshOn401(path) &&
    typeof window !== "undefined" &&
    getRefreshToken()
  ) {
    const next = await refreshAccessTokenSingleFlight();
    if (next) {
      token = next;
      res = await doFetch(token);
    }
  }

  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok) {
    const err = json as ApiError;
    return { success: false, message: err.message ?? `Request failed: ${res.status}`, errors: err.errors } as ApiResponse<T>;
  }
  return json;
}

export function apiGet<T>(path: string, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "GET", accessToken });
}

export function apiPost<T>(path: string, body: unknown, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "POST", body, accessToken });
}

export function apiPut<T>(path: string, body: unknown, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "PUT", body, accessToken });
}

export function apiPatch<T>(path: string, body: unknown, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "PATCH", body, accessToken });
}

export function apiDelete<T>(path: string, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "DELETE", accessToken });
}
