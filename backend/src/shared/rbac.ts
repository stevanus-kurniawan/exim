/**
 * RBAC: roles, permissions, and role→permission mapping (API Spec §7 Access Control Matrix).
 * Business rules live here; middleware only calls hasPermission.
 */

/** Supported roles (align with API Spec). */
export const ROLES = {
  ADMIN: "ADMIN",
  EXIM_OFFICER: "EXIM_OFFICER",
  VIEWER: "VIEWER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Permissions from Access Control Matrix. */
export const PERMISSIONS = {
  VIEW_TRANSACTIONS: "VIEW_TRANSACTIONS",
  CREATE_TRANSACTION: "CREATE_TRANSACTION",
  UPDATE_TRANSACTION: "UPDATE_TRANSACTION",
  UPDATE_STATUS: "UPDATE_STATUS",
  UPLOAD_DOCUMENT: "UPLOAD_DOCUMENT",
  MANAGE_USERS: "MANAGE_USERS",
  VIEW_PO_INTAKE: "VIEW_PO_INTAKE",
  TAKE_OWNERSHIP: "TAKE_OWNERSHIP",
  CREATE_PO_INTAKE_TEST: "CREATE_PO_INTAKE_TEST",
  VIEW_SHIPMENTS: "VIEW_SHIPMENTS",
  CREATE_SHIPMENT: "CREATE_SHIPMENT",
  UPDATE_SHIPMENT: "UPDATE_SHIPMENT",
  COUPLE_DECOUPLE_PO: "COUPLE_DECOUPLE_PO",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.CREATE_TRANSACTION,
    PERMISSIONS.UPDATE_TRANSACTION,
    PERMISSIONS.UPDATE_STATUS,
    PERMISSIONS.UPLOAD_DOCUMENT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_PO_INTAKE,
    PERMISSIONS.TAKE_OWNERSHIP,
    PERMISSIONS.CREATE_PO_INTAKE_TEST,
    PERMISSIONS.VIEW_SHIPMENTS,
    PERMISSIONS.CREATE_SHIPMENT,
    PERMISSIONS.UPDATE_SHIPMENT,
    PERMISSIONS.COUPLE_DECOUPLE_PO,
  ],
  [ROLES.EXIM_OFFICER]: [
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.CREATE_TRANSACTION,
    PERMISSIONS.UPDATE_TRANSACTION,
    PERMISSIONS.UPDATE_STATUS,
    PERMISSIONS.UPLOAD_DOCUMENT,
    PERMISSIONS.VIEW_PO_INTAKE,
    PERMISSIONS.TAKE_OWNERSHIP,
    PERMISSIONS.CREATE_PO_INTAKE_TEST,
    PERMISSIONS.VIEW_SHIPMENTS,
    PERMISSIONS.CREATE_SHIPMENT,
    PERMISSIONS.UPDATE_SHIPMENT,
    PERMISSIONS.COUPLE_DECOUPLE_PO,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.VIEW_PO_INTAKE,
    PERMISSIONS.CREATE_PO_INTAKE_TEST, /* temporary for E2E testing until SaaS integration */
    PERMISSIONS.VIEW_SHIPMENTS,
  ],
};

/** Normalized role key (uppercase) for lookup. */
function normalizeRole(role: string): string {
  return role.toUpperCase();
}

/** Returns whether the given role has the given permission. */
export function hasPermission(role: string, permission: string): boolean {
  const key = normalizeRole(role);
  const list = ROLE_PERMISSIONS[key];
  if (!list) return false;
  return list.includes(permission as Permission);
}

/** Returns all permissions for a role (for future use). */
export function getPermissionsForRole(role: string): ReadonlySet<string> {
  const key = normalizeRole(role);
  const list = ROLE_PERMISSIONS[key] ?? [];
  return new Set(list);
}

/** Valid role values for DB/validation. */
export const VALID_ROLES: readonly string[] = Object.values(ROLES);
