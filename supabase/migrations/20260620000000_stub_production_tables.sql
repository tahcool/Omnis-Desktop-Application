-- ================================================================
-- Stub migration: Create core RBAC schema + minimal table stubs
-- for FleeTrack and SalesTrack tables referenced by later ALTER
-- TABLE migrations but only exist in production via the
-- consolidated base schema.
-- ================================================================

-- ── Core RBAC (from Phase 11 consolidated base schema) ──────────
CREATE TABLE IF NOT EXISTS public.user_system_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  systems JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_system_access ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  status boolean;
BEGIN
  SELECT is_admin INTO status FROM public.user_system_access WHERE user_id = auth.uid();
  RETURN COALESCE(status, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
DROP POLICY IF EXISTS "Admins have full access to user_system_access" ON public.user_system_access;
CREATE POLICY "Admins have full access to user_system_access"
  ON public.user_system_access
  FOR ALL
  USING ( public.is_admin() );

DROP POLICY IF EXISTS "Users can read their own access level" ON public.user_system_access;
CREATE POLICY "Users can read their own access level"
  ON public.user_system_access
  FOR SELECT
  USING (user_id = auth.uid());

-- Auto-create access row on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_access()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_system_access (user_id, is_admin, systems)
  VALUES (NEW.id, false, '[]'::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_access ON auth.users;
CREATE TRIGGER on_auth_user_created_access
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_access();


-- SalesTrack tables (referenced by ALTER TABLE in later migrations)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fmb_report_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID,
  machine TEXT,
  brand TEXT,
  status TEXT,
  target_handover DATE,
  revised_handover DATE,
  actual_handover DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT,
  request_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS omnis_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS omnis_tracking_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FleeTrack tables (referenced by ALTER TABLE in later migrations)
CREATE TABLE IF NOT EXISTS ft_machine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ft_defect (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ft_service_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ft_customer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Healthcare tables
CREATE TABLE IF NOT EXISTS omnis_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS omnis_sick_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit trail (columns match admin-operations Edge Function)
CREATE TABLE IF NOT EXISTS omnis_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT,
  event_type TEXT,
  entity_type TEXT,
  entity_name TEXT,
  user_id UUID,
  user_email TEXT,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE omnis_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select" ON omnis_audit_trail FOR SELECT USING (true);
CREATE POLICY "audit_insert" ON omnis_audit_trail FOR INSERT WITH CHECK (true);
