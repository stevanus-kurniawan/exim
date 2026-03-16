-- Optional: enforce allowed role values (align with shared/rbac.ts).
-- Run after 001_auth_tables.sql. Remove constraint if adding new roles before code deploy.

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_role;

ALTER TABLE users
  ADD CONSTRAINT chk_users_role
  CHECK (UPPER(TRIM(role)) IN ('ADMIN', 'EXIM_OFFICER', 'VIEWER'));
