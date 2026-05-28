-- ═══════════════════════════════════════════════════════════════
-- FLEETRACK CUSTOMER PORTAL — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Project: pfqaeewmlwfayxbgmuaq
-- ═══════════════════════════════════════════════════════════════

-- 1. Customer portal accounts
CREATE TABLE IF NOT EXISTS public.ft_customer_portal_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  contact_name  text NOT NULL,
  email         text NOT NULL,
  phone         text,
  access_level  text NOT NULL DEFAULT 'Reporter',
  is_active     boolean NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz
);

-- 2. Machine assignments (which machines each portal account can see)
CREATE TABLE IF NOT EXISTS public.ft_portal_machine_assignments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id  uuid NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  machine_name       text NOT NULL,
  serial_number      text,
  machine_type       text,
  site_location      text,
  last_service_date  date,
  machine_status     text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- 3. Portal-submitted defect reports
CREATE TABLE IF NOT EXISTS public.ft_portal_defect_reports (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id  uuid NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  customer_name      text,
  machine_name       text NOT NULL,
  category           text NOT NULL,
  severity           text NOT NULL,
  description        text NOT NULL,
  operator_name      text,
  submitted_by       text,
  status             text NOT NULL DEFAULT 'New',
  admin_notes        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz
);

-- ─── Enable RLS on all three tables ───────────────────────────
ALTER TABLE public.ft_customer_portal_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_machine_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_defect_reports       ENABLE ROW LEVEL SECURITY;

-- ─── RLS: service_role (Fleetrack desktop app) gets full access ─
CREATE POLICY "portal_accounts_service_all" ON public.ft_customer_portal_accounts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "portal_machine_assignments_service_all" ON public.ft_portal_machine_assignments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "portal_defect_reports_service_all" ON public.ft_portal_defect_reports
  FOR ALL USING (auth.role() = 'service_role');

-- ─── RLS: customers can only see their own account ─────────────
CREATE POLICY "portal_accounts_own_read" ON public.ft_customer_portal_accounts
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "portal_accounts_own_update" ON public.ft_customer_portal_accounts
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- ─── RLS: customers can read their machine assignments ──────────
CREATE POLICY "portal_machine_assignments_own_read" ON public.ft_portal_machine_assignments
  FOR SELECT USING (
    portal_account_id IN (
      SELECT id FROM public.ft_customer_portal_accounts
      WHERE auth_user_id = auth.uid()
    )
  );

-- ─── RLS: customers can read + submit their defect reports ──────
CREATE POLICY "portal_defect_reports_own_read" ON public.ft_portal_defect_reports
  FOR SELECT USING (
    portal_account_id IN (
      SELECT id FROM public.ft_customer_portal_accounts
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "portal_defect_reports_own_insert" ON public.ft_portal_defect_reports
  FOR INSERT WITH CHECK (
    portal_account_id IN (
      SELECT id FROM public.ft_customer_portal_accounts
      WHERE auth_user_id = auth.uid()
    )
  );

-- ─── Verify tables were created ────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'ft_portal%'
ORDER BY table_name;
