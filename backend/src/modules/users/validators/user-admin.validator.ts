/**
 * Validate admin user create / patch bodies.
 */

import type { Request } from "express";
import type { ErrorField } from "../../../shared/response.js";
import { ALL_PERMISSION_KEYS } from "../../../shared/rbac.js";

const permSet = new Set<string>(ALL_PERMISSION_KEYS);

export interface CreateUserBody {
  name: string;
  email: string;
  password: string;
  role: string;
  permission_overrides?: string[];
}

export function validateCreateUserBody(
  req: Request
): { ok: true; data: CreateUserBody } | { ok: false; errors: ErrorField[] } {
  const b = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];
  const name = typeof b.name === "string" ? b.name : "";
  const email = typeof b.email === "string" ? b.email : "";
  const password = typeof b.password === "string" ? b.password : "";
  const role = typeof b.role === "string" ? b.role : "";
  if (!name.trim()) errors.push({ field: "name", message: "Required" });
  if (!email.trim()) errors.push({ field: "email", message: "Required" });
  if (!password) errors.push({ field: "password", message: "Required" });
  if (!role.trim()) errors.push({ field: "role", message: "Required" });

  let permission_overrides: string[] | undefined;
  if (b.permission_overrides !== undefined) {
    if (!Array.isArray(b.permission_overrides)) {
      errors.push({ field: "permission_overrides", message: "Must be an array of permission keys" });
    } else {
      const bad = b.permission_overrides.find((p) => typeof p !== "string" || !permSet.has(p));
      if (bad !== undefined) {
        errors.push({ field: "permission_overrides", message: "Contains invalid permission key" });
      } else {
        permission_overrides = b.permission_overrides as string[];
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, data: { name, email, password, role, permission_overrides } };
}

export interface PatchUserBody {
  name?: string;
  role?: string;
  is_active?: boolean;
  permission_overrides?: string[];
  password?: string;
}

export function validatePatchUserBody(
  req: Request
): { ok: true; data: PatchUserBody } | { ok: false; errors: ErrorField[] } {
  const b = req.body as Record<string, unknown>;
  const errors: ErrorField[] = [];
  const data: PatchUserBody = {};

  if (b.name !== undefined) {
    if (typeof b.name !== "string" || !b.name.trim()) errors.push({ field: "name", message: "Must be a non-empty string" });
    else data.name = b.name;
  }
  if (b.role !== undefined) {
    if (typeof b.role !== "string" || !b.role.trim()) errors.push({ field: "role", message: "Must be a non-empty string" });
    else data.role = b.role;
  }
  if (b.is_active !== undefined) {
    if (typeof b.is_active !== "boolean") errors.push({ field: "is_active", message: "Must be a boolean" });
    else data.is_active = b.is_active;
  }
  if (b.password !== undefined) {
    if (typeof b.password !== "string" || !b.password) errors.push({ field: "password", message: "Must be a non-empty string" });
    else data.password = b.password;
  }
  if (b.permission_overrides !== undefined) {
    if (!Array.isArray(b.permission_overrides)) {
      errors.push({ field: "permission_overrides", message: "Must be an array of permission keys" });
    } else {
      const bad = b.permission_overrides.find((p) => typeof p !== "string" || !permSet.has(p));
      if (bad !== undefined) {
        errors.push({ field: "permission_overrides", message: "Contains invalid permission key" });
      } else {
        data.permission_overrides = b.permission_overrides as string[];
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  if (
    data.name === undefined &&
    data.role === undefined &&
    data.is_active === undefined &&
    data.password === undefined &&
    data.permission_overrides === undefined
  ) {
    return { ok: false, errors: [{ field: "body", message: "At least one field is required" }] };
  }
  return { ok: true, data };
}
