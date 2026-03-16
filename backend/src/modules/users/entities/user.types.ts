/**
 * User entity types. Source of truth: users table.
 */

import type { Role } from "../../../shared/rbac.js";

/** User as returned from API (no password). */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Minimal user for auth context (matches req.user). */
export interface UserContext {
  id: string;
  email: string;
  name: string;
  role: string;
}
