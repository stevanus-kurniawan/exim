-- Optional per-user permission grants on top of role (RBAC). Empty array = role only.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS permission_overrides TEXT[] NOT NULL DEFAULT '{}';
