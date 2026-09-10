-- Migration: Last-administrator protection
-- Enforces that at least one global admin always exists in user_system_access.
-- Used by admin-operations Edge Function for transactional safety.
--
-- Invariant: At least one active (non-banned) user with is_admin=true in
-- user_system_access must exist at all times. "Active" means the user's
-- auth.users.banned_until is NULL or in the past.
--
-- This is a GLOBAL invariant, not per-company. Company-scoped admin
-- restrictions are enforced at the Edge Function layer.

-- Function: check_last_admin_removal
-- Pre-flight check: returns true if removing admin status from target_user_id
-- would leave zero active global admins. Used by suspendUser and deleteUser
-- where the admin removal is via Auth API (ban/delete) rather than DB update.
--
-- This function locks admin rows with FOR UPDATE to prevent concurrent
-- operations from racing past the check.
CREATE OR REPLACE FUNCTION public.check_last_admin_removal(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_admin_count INTEGER;
BEGIN
  -- Lock all admin rows to serialize concurrent admin-removal operations.
  -- This prevents two concurrent suspensions/deletions from both passing
  -- the check and removing the last two admins.
  PERFORM 1 FROM user_system_access
  WHERE is_admin = true
  FOR UPDATE;

  -- Count distinct active global admins, excluding the target user.
  SELECT COUNT(DISTINCT usa.user_id) INTO active_admin_count
  FROM user_system_access usa
  INNER JOIN auth.users au ON au.id = usa.user_id
  WHERE usa.is_admin = true
    AND usa.user_id != target_user_id
    AND (au.banned_until IS NULL OR au.banned_until < now());

  -- If no other active admins remain, this removal would leave zero admins.
  RETURN active_admin_count = 0;
END;
$$;

-- Function: safe_remove_admin
-- Atomically demotes a user from admin, but ONLY if at least one other active
-- admin would remain after the change. Returns {ok: bool, reason: text}.
--
-- Concurrency: Locks ALL admin rows (FOR UPDATE) before counting, so two
-- concurrent demotions will serialize: the first succeeds, the second sees
-- the updated count and fails if it would leave zero admins.
--
-- NOTE: This function only covers the database update. The Auth API metadata
-- update (app_metadata.role) happens in the Edge Function AFTER this succeeds.
-- If the Auth update fails, the DB state is authoritative — the user will not
-- pass the DB authorization check in admin-operations regardless of stale
-- Auth metadata. No separate reconciliation is needed because:
-- 1. DB is authoritative for admin checks (admin-operations reads user_system_access)
-- 2. Stale Auth metadata cannot grant access the DB doesn't authorize
-- 3. makeAdmin re-syncs both DB and Auth if re-promotion is intended
CREATE OR REPLACE FUNCTION public.safe_remove_admin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_admin_count INTEGER;
  target_is_admin BOOLEAN;
BEGIN
  -- Lock admin rows to prevent concurrent demotion
  PERFORM 1 FROM user_system_access
  WHERE is_admin = true
  FOR UPDATE;

  -- Verify target is actually an admin (idempotency: if already demoted, succeed)
  SELECT is_admin INTO target_is_admin
  FROM user_system_access
  WHERE user_id = target_user_id;

  IF target_is_admin IS NULL OR target_is_admin = false THEN
    RETURN jsonb_build_object(
      'ok', true,
      'reason', 'User is not currently an administrator.'
    );
  END IF;

  -- Count active admins excluding the target
  SELECT COUNT(DISTINCT usa.user_id) INTO active_admin_count
  FROM user_system_access usa
  INNER JOIN auth.users au ON au.id = usa.user_id
  WHERE usa.is_admin = true
    AND usa.user_id != target_user_id
    AND (au.banned_until IS NULL OR au.banned_until < now());

  IF active_admin_count = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'Cannot remove the last active global administrator.'
    );
  END IF;

  -- Safe to proceed — demote
  UPDATE user_system_access
  SET is_admin = false
  WHERE user_id = target_user_id;

  RETURN jsonb_build_object('ok', true, 'reason', '');
END;
$$;

-- Grant execute to service_role (Edge Functions use service role key)
GRANT EXECUTE ON FUNCTION public.check_last_admin_removal(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.safe_remove_admin(UUID) TO service_role;

-- CRITICAL: Revoke from anon and authenticated roles to prevent direct RPC bypass.
-- These functions must only be callable via service_role (Edge Functions).
REVOKE EXECUTE ON FUNCTION public.check_last_admin_removal(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_last_admin_removal(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.safe_remove_admin(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.safe_remove_admin(UUID) FROM authenticated;

COMMENT ON FUNCTION public.check_last_admin_removal IS
  'Pre-flight: returns true if removing admin from the given user would leave zero active global admins. Locks admin rows to prevent concurrent races. Callable only by service_role.';
COMMENT ON FUNCTION public.safe_remove_admin IS
  'Atomically demotes a user from admin with last-admin protection. Locks admin rows with FOR UPDATE. Callable only by service_role.';
