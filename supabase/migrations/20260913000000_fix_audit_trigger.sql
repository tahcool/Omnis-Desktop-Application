-- Fix audit trigger: remove reference to non-existent user_id column
-- The omnis_audit_trail table has no user_id column. The trigger
-- trg_pin_audit_source incorrectly sets NEW.user_id := auth.uid()
-- which would error for client-role inserts. Since service_role
-- callers bypass the trigger, the error was never observed, but
-- client audit inserts would fail silently.
--
-- The corrected trigger only pins source='client' for non-backend
-- callers. Backend callers (service_role) continue to supply their
-- own source value (e.g. 'admin-operations').

BEGIN;

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
  -- Client: force source='client'
  NEW.source := 'client';
  RETURN NEW;
END;
$$;

COMMIT;
