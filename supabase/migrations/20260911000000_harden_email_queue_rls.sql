-- Migration: Harden omnis_email_queue RLS policies
-- Closes the direct cross-system email submission bypass.
--
-- Background:
--   Production has a single INSERT policy:
--     allow_authenticated_insert_queue: WITH CHECK (auth.uid() IS NOT NULL)
--   This allows any authenticated user to insert emails to ANY system,
--   bypassing the email-submit Edge Function's scope enforcement.
--
-- Existing direct queue writers (backward compatibility):
--   - systems/email/index.html: Direct PostgREST INSERT/GET/PATCH
--   - systems/salestrack/index.html: Direct PostgREST INSERT
--   - supabase/functions/email-submit: Uses service_role (unaffected)
--   - supabase/functions/daily-quote-reminders: Uses service_role (unaffected)
--   - supabase/functions/process-email-queue: Uses service_role (unaffected)
--
-- Scope:
--   1. Enforce system membership on INSERT via user_system_access.
--   2. Pin created_by_id to auth.uid() (deny spoofing).
--   3. Restrict writes to caller-owned fields only.
--   4. Provide scoped SELECT for the desktop queue viewer.
--   5. Allow only status-field UPDATEs (cancel/retry) on own-system rows.
--   6. Service role retains full access.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1. Drop the old broad INSERT policy
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS allow_authenticated_insert_queue ON omnis_email_queue;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Helper function: check system membership
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
      AND (
        is_admin = true
        OR systems @> jsonb_build_array(target_system)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_system_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_system_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_system_access(TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Trigger: pin created_by_id to the calling user on INSERT
--    Prevents spoofing via the Data API.
--    service_role (used by email-submit for on-behalf submissions)
--    bypasses RLS, so the trigger must also allow service_role to
--    set created_by_id explicitly.
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
  NEW.status        := COALESCE(NEW.status, 'pending');
  IF NEW.status NOT IN ('pending') THEN
    NEW.status := 'pending';
  END IF;
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
--    Authenticated users may change only: status (cancel/retry).
--    Worker fields (sent_at, error_message, retry_count, payload_hash,
--    created_by_id, created_by, system) are immutable via client writes.
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

  -- Prevent system change
  NEW.system        := OLD.system;
  -- Prevent creator change
  NEW.created_by    := OLD.created_by;
  NEW.created_by_id := OLD.created_by_id;
  -- Prevent worker-owned field changes
  NEW.sent_at       := OLD.sent_at;
  NEW.error_message := OLD.error_message;
  NEW.retry_count   := OLD.retry_count;
  NEW.payload_hash  := OLD.payload_hash;
  -- Prevent scheduling change
  NEW.scheduled_for := OLD.scheduled_for;

  -- Restrict status transitions: only pending→cancelled, failed→pending
  IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
    NULL; -- allowed
  ELSIF OLD.status = 'failed' AND NEW.status = 'pending' THEN
    NULL; -- retry allowed
  ELSE
    NEW.status := OLD.status; -- discard other transitions
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
-- 6. SELECT policy: desktop queue viewer needs to read own-system rows
--    Scoped by system membership.
-- ═══════════════════════════════════════════════════════════════════
CREATE POLICY email_queue_select_scoped ON omnis_email_queue
  FOR SELECT TO authenticated
  USING (
    user_has_system_access(system)
  );

-- ═══════════════════════════════════════════════════════════════════
-- 7. UPDATE policy: cancel/retry on own-system rows
--    Trigger (trg_protect_email_fields) restricts which fields change.
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
-- 9. Harden user_system_access: prevent self-modification edge cases
--    The existing FOR ALL policy with USING(is_admin()) allows admins
--    to modify any row including their own.
--    Add a trigger to prevent the last admin from demoting themselves.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_protect_last_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Only care about changes that remove admin status or delete admins
  IF TG_OP = 'UPDATE' AND OLD.is_admin = true AND NEW.is_admin = false THEN
    SELECT count(*) INTO admin_count
    FROM user_system_access
    WHERE is_admin = true AND user_id != OLD.user_id;
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last active administrator via direct table access'
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_admin = true THEN
    SELECT count(*) INTO admin_count
    FROM user_system_access
    WHERE is_admin = true AND user_id != OLD.user_id;
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last active administrator via direct table access'
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
-- 10. Harden audit trail: separate trusted from untrusted entries
--     Add a source column to distinguish client telemetry from
--     backend security events. Pin user_id to auth.uid() for clients.
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE omnis_audit_trail
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'client';

-- Trigger: clients cannot mark entries as 'system' or 'admin'
CREATE OR REPLACE FUNCTION public.trg_pin_audit_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  -- Client entries: force source='client' and user_id=auth.uid()
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
