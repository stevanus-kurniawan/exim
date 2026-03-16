/**
 * Frontend config — env only; no hardcoded URLs or secrets (cursor-rules §2, §7).
 * NEXT_PUBLIC_* vars are inlined at build time for client; server has full process.env.
 */

function getEnv(key: string, defaultValue?: string): string {
  const v = typeof window !== "undefined"
    ? (process.env as Record<string, string | undefined>)[key]
    : process.env[key];
  return (v ?? defaultValue ?? "") as string;
}

export const config = {
  /** Backend API base (e.g. http://localhost:3003/api/v1). Must be NEXT_PUBLIC_API_URL for client. */
  apiBaseUrl: getEnv("NEXT_PUBLIC_API_URL", "http://localhost:3003/api/v1"),
} as const;
