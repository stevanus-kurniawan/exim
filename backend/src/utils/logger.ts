/**
 * Simple structured logger. Does not log secrets or raw passwords.
 */

import { config } from "../config/index.js";

const levelOrder = ["debug", "info", "warn", "error"] as const;
type Level = (typeof levelOrder)[number];

function shouldLog(level: Level): boolean {
  const configured = config.log.level?.toLowerCase() ?? "info";
  const idx = levelOrder.indexOf(level);
  const configIdx = levelOrder.indexOf(configured as Level);
  if (configIdx === -1) return level !== "debug";
  return idx >= configIdx;
}

function log(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const out = JSON.stringify(entry);
  if (level === "error") {
    console.error(out);
  } else if (level === "warn") {
    console.warn(out);
  } else {
    console.log(out);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};
