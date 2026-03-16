/**
 * Email verification token repository.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";

export interface CreateVerificationTokenInput {
  userId: string;
  token: string;
  expiresAt: Date;
}

export class EmailVerificationTokenRepository {
  private get pool(): Pool {
    return getPool();
  }

  async create(input: CreateVerificationTokenInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [input.userId, input.token, input.expiresAt]
    );
  }

  async findByToken(token: string): Promise<{ user_id: string; expires_at: Date } | null> {
    const result = await this.pool.query<{ user_id: string; expires_at: Date }>(
      `SELECT user_id, expires_at FROM email_verification_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );
    return result.rows[0] ?? null;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.pool.query(`DELETE FROM email_verification_tokens WHERE token = $1`, [token]);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.pool.query(`DELETE FROM email_verification_tokens WHERE user_id = $1`, [userId]);
  }
}
