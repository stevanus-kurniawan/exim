/**
 * API client abstraction — single place for fetch, auth headers, and 401 refresh handling.
 * Token strategy: access token in memory (supplied by caller); on 401, caller should refresh and retry.
 */

import { config } from "@/lib/config";
import type { ApiResponse, ApiError } from "@/types/api";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** If provided, access token is sent as Bearer. */
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

/**
 * Request to API. On non-OK responses returns error body (success: false, message, errors); does not throw.
 */
/** Low-level request; prefer apiGet/apiPost unless you need FormData (e.g. file upload). */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { accessToken, body, ...init } = options;
  const url = path.startsWith("http") ? path : `${config.apiBaseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const customHeaders =
    init.headers && typeof init.headers === "object" && !Array.isArray(init.headers) && !(init.headers instanceof Headers)
      ? (init.headers as Record<string, string>)
      : undefined;
  const res = await fetch(url, {
    ...init,
    headers: getHeaders(accessToken, customHeaders, body),
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok) {
    const err = json as ApiError;
    return { success: false, message: err.message ?? `Request failed: ${res.status}`, errors: err.errors } as ApiResponse<T>;
  }
  return json;
}

/**
 * GET helper.
 */
export function apiGet<T>(path: string, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "GET", accessToken });
}

/**
 * POST helper.
 */
export function apiPost<T>(path: string, body: unknown, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "POST", body, accessToken });
}

/**
 * PUT helper.
 */
export function apiPut<T>(path: string, body: unknown, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "PUT", body, accessToken });
}

/**
 * PATCH helper.
 */
export function apiPatch<T>(path: string, body: unknown, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "PATCH", body, accessToken });
}

/**
 * DELETE helper.
 */
export function apiDelete<T>(path: string, accessToken?: string | null): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: "DELETE", accessToken });
}
