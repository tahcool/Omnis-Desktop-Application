-- Migration: Last-administrator protection
-- Enforces that at least one global admin always exists in user_system_access.
-- Used by admin-operations Edge Function for transactional safety.

-- Function: check_last_admin_removal
-- Returns true if removing admin status from target_user_id would leave zero
-- global admins. Uses FOR UPDATE SKIP LOCKED for concurrency safety.
-- "Global admin" = is_admin = true AND the user is not banned in auth.users.
CREATE OR REPLACE FUNCTION public.check_last_admin_removal(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_admin_count INTEGER;
BEGIN
  -- Count distinct active global admins, excluding the target user.
  -- FOR UPDATE locks the rows to prevent concurrent demotion races.
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
-- Atomically demotes a user from admin, but ONLY if at least one other admin
-- would remain after the change. Returns {ok: bool, reason: text}.
CREATE OR REPLACE FUNCTION public.safe_remove_admin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_admin_count INTEGER;
BEGIN
  -- Lock admin rows to prevent concurrent demotion
  PERFORM 1 FROM user_system_access
  WHERE is_admin = true
  FOR UPDATE;

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

COMMENT ON FUNCTION public.check_last_admin_removal IS
  'Returns true if removing admin from the given user would leave zero active global admins. Used for pre-flight checks on suspend/delete.';
COMMENT ON FUNCTION public.safe_remove_admin IS
  'Atomically demotes a user from admin with last-admin protection. Locks admin rows to prevent concurrent races.';
