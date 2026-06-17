-- ═══════════════════════════════════════════════════════════════════════════
-- Omnis Fleetrack — Customer Portal Tables
-- Run this in: https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql/new
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- 1. ft_customer_portal_accounts
--    One row per customer contact who has portal access
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ft_customer_portal_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL,
  contact_name   TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  access_level   TEXT NOT NULL DEFAULT 'Reporter',  -- 'View Only' | 'Reporter' | 'Full Access'
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one portal account per email address
CREATE UNIQUE INDEX IF NOT EXISTS ft_customer_portal_accounts_email_idx
  ON public.ft_customer_portal_accounts (email);

-- Unique: one portal account per Supabase auth user
CREATE UNIQUE INDEX IF NOT EXISTS ft_customer_portal_accounts_auth_user_idx
  ON public.ft_customer_portal_accounts (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.ft_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER ft_portal_accounts_updated_at
  BEFORE UPDATE ON public.ft_customer_portal_accounts
  FOR EACH ROW EXECUTE FUNCTION public.ft_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────
-- 2. ft_portal_machine_assignments
--    Many-to-many: portal account ↔ machines the customer can see
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ft_portal_machine_assignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id  UUID NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  machine_name       TEXT NOT NULL,   -- matches ft_machine.name
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS ft_portal_machine_assignments_unique_idx
  ON public.ft_portal_machine_assignments (portal_account_id, machine_name);

-- Fast lookup by machine
CREATE INDEX IF NOT EXISTS ft_portal_machine_assignments_machine_idx
  ON public.ft_portal_machine_assignments (machine_name);


-- ─────────────────────────────────────────────────────────────────────────
-- 3. ft_portal_defect_reports
--    Defect reports submitted by customers through the portal
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ft_portal_defect_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id  UUID REFERENCES public.ft_customer_portal_accounts(id) ON DELETE SET NULL,
  customer_name      TEXT,
  machine_name       TEXT NOT NULL,
  category           TEXT,
  severity           TEXT,   -- 'Critical' | 'Major' | 'Minor'
  description        TEXT NOT NULL,
  operator_name      TEXT,
  submitted_by       TEXT,
  status             TEXT NOT NULL DEFAULT 'New',   -- 'New' | 'In Progress' | 'Resolved' | 'Closed'
  resolved_by        TEXT,
  resolved_at        TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ft_portal_defect_reports_account_idx
  ON public.ft_portal_defect_reports (portal_account_id);

CREATE INDEX IF NOT EXISTS ft_portal_defect_reports_machine_idx
  ON public.ft_portal_defect_reports (machine_name);

CREATE INDEX IF NOT EXISTS ft_portal_defect_reports_status_idx
  ON public.ft_portal_defect_reports (status);

CREATE OR REPLACE TRIGGER ft_portal_reports_updated_at
  BEFORE UPDATE ON public.ft_portal_defect_reports
  FOR EACH ROW EXECUTE FUNCTION public.ft_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────
-- 4. ft_portal_impersonation_log  (used by admin "Impersonate" feature)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ft_portal_impersonation_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id  UUID REFERENCES public.ft_customer_portal_accounts(id) ON DELETE SET NULL,
  portal_email       TEXT,
  admin_email        TEXT,
  reason             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- The main app uses service_role (bypasses RLS).
-- The customer-portal.html uses the anon key + Supabase Auth JWT — 
-- so customers need restricted row-level access.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.ft_customer_portal_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_machine_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_defect_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_impersonation_log     ENABLE ROW LEVEL SECURITY;

-- Portal account: customer can only read their own row
CREATE POLICY "portal_account_self_read"
  ON public.ft_customer_portal_accounts
  FOR SELECT
  TO authenticated
  USING ( auth_user_id = (SELECT auth.uid()) AND is_active = true );

-- Machine assignments: customer can only see their own assignments
CREATE POLICY "portal_assignments_self_read"
  ON public.ft_portal_machine_assignments
  FOR SELECT
  TO authenticated
  USING (
    portal_account_id IN (
      SELECT id FROM public.ft_customer_portal_accounts
      WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true
    )
  );

-- Defect reports: customer can read their own + insert new ones
CREATE POLICY "portal_reports_self_read"
  ON public.ft_portal_defect_reports
  FOR SELECT
  TO authenticated
  USING (
    portal_account_id IN (
      SELECT id FROM public.ft_customer_portal_accounts
      WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "portal_reports_self_insert"
  ON public.ft_portal_defect_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    portal_account_id IN (
      SELECT id FROM public.ft_customer_portal_accounts
      WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true
    )
  );

-- Impersonation log: no direct customer access
-- (service_role only via main.js IPC)


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY: run this to confirm all 4 tables were created
-- ═══════════════════════════════════════════════════════════════════════════
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'ft_portal%'
  OR table_name = 'ft_customer_portal_accounts'
ORDER BY table_name;
