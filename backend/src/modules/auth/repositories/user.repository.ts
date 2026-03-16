/**
 * User repository: database access only. No business logic.
 * Assumes table: users (id, email, password_hash, name, role, is_active, created_at, updated_at).
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type { UserRow } from "../dto/index.js";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role: string;
}

export class UserRepository {
  private get pool(): Pool {
    return getPool();
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password_hash, name, role, is_active, email_verified_at, created_at, updated_at
       FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true LIMIT 1`,
      [email]
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password_hash, name, role, is_active, email_verified_at, created_at, updated_at
       FROM users WHERE id = $1 AND is_active = true LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO users (id, email, password_hash, name, role, is_active, email_verified_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NULL, NOW(), NOW())
       RETURNING id, email, password_hash, name, role, is_active, email_verified_at, created_at, updated_at`,
      [input.email, input.passwordHash, input.name, input.role]
    );
    if (!result.rows[0]) {
      throw new Error("UserRepository.create: no row returned");
    }
    return result.rows[0];
  }

  async setEmailVerified(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );
  }
}
