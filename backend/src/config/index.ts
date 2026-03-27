/**
 * Environment config loader.
 * All configurable values from env; no hardcoded secrets.
 */

import dotenv from "dotenv";
import path from "path";

// Load root .env first (e.g. EOS/.env when running from EOS/backend), then backend .env so local overrides work
const backendDir = path.resolve(__dirname, "../..");
const rootEnv = path.join(backendDir, "..", ".env");
dotenv.config({ path: rootEnv });
dotenv.config();

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getEnvOptional = (key: string, defaultValue?: string): string | undefined => {
  return process.env[key] ?? defaultValue;
};

export const config = {
  nodeEnv: getEnvOptional("NODE_ENV", "development"),
  port: (() => {
    const raw = getEnvOptional("PORT", "3003") ?? "3003";
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? 3003 : n;
  })(),
  database: {
    url: getEnv("DATABASE_URL"),
  },
  jwt: {
    accessSecret: getEnvOptional("JWT_ACCESS_SECRET"),
    refreshSecret: getEnvOptional("JWT_REFRESH_SECRET"),
    accessExpiresIn: getEnvOptional("JWT_ACCESS_EXPIRES_IN", "1h"),
    refreshExpiresIn: getEnvOptional("JWT_REFRESH_EXPIRES_IN", "7d"),
  },
  storage: {
    type: getEnvOptional("STORAGE_TYPE", "local"),
    localPath: getEnvOptional("STORAGE_LOCAL_PATH", "./uploads"),
  },
  log: {
    level: getEnvOptional("LOG_LEVEL", "info"),
  },
  cors: {
    origins: getEnvOptional("CORS_ORIGINS")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
  },
  poPolling: {
    enabled: (getEnvOptional("PO_POLLING_ENABLED", "false") ?? "false") === "true",
    intervalMs: (() => {
      const raw = getEnvOptional("PO_POLLING_INTERVAL_MS", "300000") ?? "300000";
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? 5 * 60 * 1000 : Math.max(60000, n);
    })(),
    saasApiBaseUrl: getEnvOptional("SAAS_PO_API_BASE_URL"),
  },
  /** Registration: allow any email when true (e.g. development); otherwise only ALLOWED_EMAIL_DOMAIN. */
  auth: {
    allowAnyEmail: (getEnvOptional("ALLOW_ANY_EMAIL", "false") ?? "false").toLowerCase() === "true",
    allowedEmailDomain: getEnvOptional("ALLOWED_EMAIL_DOMAIN", "energi-up.com") ?? "energi-up.com",
    /** Base URL of frontend for verification and reset links (e.g. http://localhost:3000). */
    frontendBaseUrl: getEnvOptional("FRONTEND_BASE_URL", "http://localhost:3000") ?? "http://localhost:3000",
  },
  smtp: {
    host: getEnvOptional("SMTP_HOST", "localhost"),
    port: (() => {
      const raw = getEnvOptional("SMTP_PORT", "587") ?? "587";
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? 587 : n;
    })(),
    secure: (getEnvOptional("SMTP_SECURE", "false") ?? "false").toLowerCase() === "true",
    user: getEnvOptional("SMTP_USER"),
    /** SMTP_PASS or SMTP_PASSWORD (both supported so .env can use either name). */
    pass: getEnvOptional("SMTP_PASS") ?? getEnvOptional("SMTP_PASSWORD"),
    from: getEnvOptional("SMTP_FROM", "noreply@energi-up.com"),
  },
} as const;

export type Config = typeof config;
