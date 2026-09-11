-- Migration: Harden omnis_email_queue RLS policies
-- Closes the direct cross-system email submission bypass.
-- Aligns database access with the established scoped-admin design.
--
-- Background:
--   Production has a single INSERT policy:
--     allow_authenticated_insert_queue: WITH CHECK (auth.uid() IS NOT NULL)
--   This allows any authenticated user to insert emails to ANY system.
--
-- Backend contract (admin-operations, email-submit Edge Functions):
--   - Ordinary users: operate within their systems[] array
--   - Scoped admins (is_admin=true): operate within their systems[] array
--   - Super-admins (hardcoded emails): global access (bypasses system scope)
--   The database helper must match this same contract.
--
-- Existing direct queue writers (backward compatibility):
--   - systems/email/index.html: Direct PostgREST INSERT/GET/PATCH
--     - PATCH sends { status: 'pending', retry_count: 0, error_message: null }
--       for retry. Trigger must allow retry_count reset on failed→pending.
--   - systems/salestrack/index.html: Direct PostgREST INSERT
--   - supabase/functions/email-submit: Uses service_role (unaffected)
--   - supabase/functions/process-email-queue: Uses service_role (unaffected)

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. Drop the old broad INSERT policy
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS allow_authenticated_insert_queue ON omnis_email_queue;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Helper function: check system membership (scoped-admin design)
--    Matches the backend contract: admins are scoped to their
--    systems[] array, NOT global. Super-admin bypass is email-based
--    and handled by the Edge Functions, not by the database.
-- ═══════════════════════════════════════════════════════════════════
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
      AND systems @> jsonb_build_array(target_system)
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_system_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_system_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_system_access(TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Trigger: pin created_by_id to the calling user on INSERT
--    service_role (used by email-submit for on-behalf submissions)
--    bypasses RLS, so the trigger checks current_setting('role').
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_pin_email_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role and postgres bypass: trust the supplied value
  IF current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- For authenticated users: force created_by_id to their auth.uid()
  NEW.created_by_id := auth.uid();

  -- Protect worker-owned fields on INSERT: force safe defaults
  NEW.status        := 'pending';
  NEW.sent_at       := NULL;
  NEW.error_message := NULL;
  NEW.retry_count   := 0;
  NEW.payload_hash  := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pin_email_creator ON omnis_email_queue;
CREATE TRIGGER pin_email_creator
  BEFORE INSERT ON omnis_email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_pin_email_creator();

-- ═══════════════════════════════════════════════════════════════════
-- 4. Trigger: protect fields on UPDATE
--    Authenticated users may:
--      pending→cancelled (cancel)
--      failed→pending (retry — also resets retry_count and error_message)
--    All other fields are immutable via client writes.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_protect_email_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role and postgres: trust all changes
  IF current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Immutable fields: always preserved
  NEW.system        := OLD.system;
  NEW.created_by    := OLD.created_by;
  NEW.created_by_id := OLD.created_by_id;
  NEW.sent_at       := OLD.sent_at;
  NEW.payload_hash  := OLD.payload_hash;
  NEW.scheduled_for := OLD.scheduled_for;

  -- Status transitions with field side-effects
  IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
    -- Cancel: only status changes
    NEW.retry_count   := OLD.retry_count;
    NEW.error_message := OLD.error_message;
  ELSIF OLD.status = 'failed' AND NEW.status = 'pending' THEN
    -- Retry: reset retry_count and error_message (matches desktop payload)
    NEW.retry_count   := 0;
    NEW.error_message := NULL;
  ELSE
    -- No other transitions allowed; preserve all fields
    NEW.status        := OLD.status;
    NEW.retry_count   := OLD.retry_count;
    NEW.error_message := OLD.error_message;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_email_fields ON omnis_email_queue;
CREATE TRIGGER protect_email_fields
  BEFORE UPDATE ON omnis_email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_email_fields();

-- ═══════════════════════════════════════════════════════════════════
-- 5. INSERT policy: system membership required
-- ═══════════════════════════════════════════════════════════════════
CREATE POLICY email_queue_insert_scoped ON omnis_email_queue
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_has_system_access(system)
  );

-- ═══════════════════════════════════════════════════════════════════
-- 6. SELECT policy: desktop queue viewer reads own-system rows
-- ═══════════════════════════════════════════════════════════════════
CREATE POLICY email_queue_select_scoped ON omnis_email_queue
  FOR SELECT TO authenticated
  USING (
    user_has_system_access(system)
  );

-- ═══════════════════════════════════════════════════════════════════
-- 7. UPDATE policy: cancel/retry on own-system rows
--    Trigger restricts which fields and transitions are allowed.
-- ═══════════════════════════════════════════════════════════════════
CREATE POLICY email_queue_update_scoped ON omnis_email_queue
  FOR UPDATE TO authenticated
  USING (
    user_has_system_access(system)
  )
  WITH CHECK (
    user_has_system_access(system)
  );

-- ═══════════════════════════════════════════════════════════════════
-- 8. No DELETE policy for authenticated
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 9. Last-admin protection trigger on user_system_access
--    Prevents direct UPDATE/DELETE that would remove the last admin.
--    The safe_remove_admin RPC also enforces this; the trigger adds
--    defense-in-depth for direct table writes.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_protect_last_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_admins INTEGER;
BEGIN
  -- Only fire when an admin is being demoted or deleted
  IF TG_OP = 'UPDATE' AND OLD.is_admin = true AND NEW.is_admin = false THEN
    SELECT count(*) INTO remaining_admins
    FROM user_system_access
    WHERE is_admin = true AND user_id != OLD.user_id;
    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last active administrator'
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_admin = true THEN
    SELECT count(*) INTO remaining_admins
    FROM user_system_access
    WHERE is_admin = true AND user_id != OLD.user_id;
    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last active administrator'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_last_admin ON user_system_access;
CREATE TRIGGER protect_last_admin
  BEFORE UPDATE OR DELETE ON user_system_access
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_last_admin();

-- ═══════════════════════════════════════════════════════════════════
-- 10. Audit trail source separation
--     Add a 'source' column to distinguish client telemetry from
--     backend security events. Pin source and user_id for clients.
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE omnis_audit_trail
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'client';

CREATE OR REPLACE FUNCTION public.trg_pin_audit_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') THEN
    -- Backend: trust the supplied source value
    RETURN NEW;
  END IF;
  -- Client: force source='client' and user_id=auth.uid()
  NEW.source  := 'client';
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pin_audit_source ON omnis_audit_trail;
CREATE TRIGGER pin_audit_source
  BEFORE INSERT ON omnis_audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_pin_audit_source();

-- Drop stale policies
DROP POLICY IF EXISTS anon_email_queue_insert ON omnis_email_queue;

COMMIT;
