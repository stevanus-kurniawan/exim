/**
 * Health controller: parse request, return response only.
 */

import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/response.js";
import { getPool } from "../../db/index.js";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  let dbStatus = "unknown";
  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      dbStatus = "connected";
    } finally {
      client.release();
    }
  } catch {
    dbStatus = "disconnected";
  }

  sendSuccess(res, {
    status: "ok",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
}
