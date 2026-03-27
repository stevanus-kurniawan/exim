/**
 * Admin user API shapes (no password fields).
 */

export interface UserAdminDto {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  email_verified_at: string | null;
  permission_overrides: string[];
  effective_permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface UserImportResultRow {
  row: number;
  email?: string;
  message: string;
}

export interface UserImportResultDto {
  created: number;
  errors: UserImportResultRow[];
}
