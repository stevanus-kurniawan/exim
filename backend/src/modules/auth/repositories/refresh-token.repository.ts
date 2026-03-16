/**
 * Refresh token repository: store and revoke tokens for session management.
 * Assumes table: refresh_tokens (id, user_id, token, expires_at, revoked_at, created_at).
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type { RefreshTokenRow } from "../dto/index.js";

export interface CreateRefreshTokenInput {
  userId: string;
  token: string;
  expiresAt: Date;
}

export class RefreshTokenRepository {
  private get pool(): Pool {
    return getPool();
  }

  async create(input: CreateRefreshTokenInput): Promise<RefreshTokenRow> {
    const result = await this.pool.query<RefreshTokenRow>(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked_at, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NULL, NOW())
       RETURNING id, user_id, token, expires_at, revoked_at, created_at`,
      [input.userId, input.token, input.expiresAt]
    );
    if (!result.rows[0]) {
      throw new Error("RefreshTokenRepository.create: no row returned");
    }
    return result.rows[0];
  }

  async findByToken(token: string): Promise<RefreshTokenRow | null> {
    const result = await this.pool.query<RefreshTokenRow>(
      `SELECT id, user_id, token, expires_at, revoked_at, created_at
       FROM refresh_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );
    return result.rows[0] ?? null;
  }

  /** Mark token as revoked (logout or rotation). */
  async revokeByToken(token: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1 AND revoked_at IS NULL`,
      [token]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /** Revoke all refresh tokens for a user (e.g. security reset). */
  async revokeAllByUserId(userId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    return result.rowCount ?? 0;
  }
}
