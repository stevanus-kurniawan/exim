/**
 * Cookie helpers for token persistence. Used so middleware can read access token for route protection.
 * Tokens are not httpOnly (frontend must set them after login) so we can send them in API requests.
 */

const ACCESS_KEY = "eos_access";
const REFRESH_KEY = "eos_refresh";

export function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${ACCESS_KEY}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getRefreshToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${REFRESH_KEY}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function setTokens(access: string, refresh: string, expiresInSeconds?: number): void {
  if (typeof document === "undefined") return;
  const maxAge = expiresInSeconds ?? 60 * 15; // 15m default
  document.cookie = `${ACCESS_KEY}=${encodeURIComponent(access)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${REFRESH_KEY}=${encodeURIComponent(refresh)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`; // 7d
}

export function clearTokens(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_KEY}=; path=/; max-age=0`;
  document.cookie = `${REFRESH_KEY}=; path=/; max-age=0`;
}

/** Cookie name for middleware to check (must match ACCESS_KEY). */
export const ACCESS_COOKIE_NAME = ACCESS_KEY;
