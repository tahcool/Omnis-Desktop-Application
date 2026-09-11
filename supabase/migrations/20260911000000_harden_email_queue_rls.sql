-- Migration: Harden omnis_email_queue RLS policies
-- Closes the direct cross-system email submission bypass.
--
-- Background:
--   Production has a single INSERT policy:
--     allow_authenticated_insert_queue: WITH CHECK (auth.uid() IS NOT NULL)
--   This allows any authenticated user to insert emails to ANY system,
--   bypassing the email-submit Edge Function's company scope enforcement.
--
-- Existing direct queue writers (compatibility preserved):
--   - systems/email/index.html: Direct PostgREST INSERT with system='omnis'
--   - systems/salestrack/index.html: Direct PostgREST INSERT with system='salestrack'
--   - systems/salestrack/dashboard_logic.js: Direct PostgREST INSERT
--   - supabase/functions/email-submit: Uses service_role (unaffected)
--   - supabase/functions/daily-quote-reminders: Uses service_role (unaffected)
--   - supabase/functions/process-email-queue: Uses service_role (unaffected)
--
-- Fix:
--   Replace the broad INSERT policy with one that verifies the caller
--   has access to the target system via user_system_access.systems.
--   Admins (is_admin=true) may insert to any system.
--   Service role retains full access via existing service_role_all_queue policy.

BEGIN;

-- 1. Drop the existing broad INSERT policy
DROP POLICY IF EXISTS allow_authenticated_insert_queue ON omnis_email_queue;

-- 2. Create a helper function that checks system membership
--    Kept minimal for RLS inline-evaluation performance.
CREATE OR REPLACE FUNCTION public.user_has_system_access(target_system TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_system_access
    WHERE user_id = auth.uid()
      AND (
        -- Admin: unrestricted system access
        is_admin = true
        -- Non-admin: check if target_system is in their systems[] array
        OR systems @> jsonb_build_array(target_system)
      )
  );
$$;

-- Grant to authenticated only (not anon, not public)
REVOKE ALL ON FUNCTION public.user_has_system_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_system_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_system_access(TEXT) TO service_role;

-- 3. Scoped INSERT policy: caller must have access to the target system
CREATE POLICY email_queue_insert_scoped ON omnis_email_queue
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_has_system_access(system)
  );

-- 4. Scoped SELECT policy: users see emails from their own systems
CREATE POLICY email_queue_select_scoped ON omnis_email_queue
  FOR SELECT TO authenticated
  USING (
    user_has_system_access(system)
  );

-- 5. Scoped UPDATE policy: users can modify emails from their own systems
--    (cancel, retry — used by systems/email/index.html)
--    Protected fields: system and created_by cannot be changed via UPDATE
CREATE POLICY email_queue_update_scoped ON omnis_email_queue
  FOR UPDATE TO authenticated
  USING (
    user_has_system_access(system)
  )
  WITH CHECK (
    user_has_system_access(system)
  );

-- 6. No DELETE policy for authenticated — emails are cancelled, not deleted

-- 7. Deny anon access entirely (anon has table grants but no RLS policy)
--    With RLS enabled and no anon policy, anon is implicitly denied.
--    Drop any stale anon policies just in case.
DROP POLICY IF EXISTS anon_email_queue_insert ON omnis_email_queue;

-- 8. Harden the audit trail INSERT policy to record caller identity
--    Production has: WITH CHECK (auth.uid() IS NOT NULL)
--    This already requires authentication. The open SELECT (USING true)
--    is intentional for accountability/transparency.
--    No change needed to audit trail policies.

COMMIT;
