-- ============================================================
-- Fleet Tracking Tables for Customer Portal
-- Run in: Supabase SQL Editor
-- Project: Fleetrack / Omnis
-- ============================================================

-- 1. FUEL LOGS — customer-submitted fuel fill-ups
CREATE TABLE IF NOT EXISTS public.ft_portal_fuel_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id uuid        NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  machine_sn        text        NOT NULL,
  machine_name      text,
  is_own_machine    boolean     NOT NULL DEFAULT false,
  log_date          date        NOT NULL DEFAULT CURRENT_DATE,
  litres            numeric(10,2) NOT NULL CHECK (litres > 0),
  hmr_at_fill       numeric(10,1),
  cost_per_litre    numeric(10,2),
  operator_name     text,
  notes             text,
  created_at        timestamptz DEFAULT now()
);

-- 2. HMR LOGS — customer-submitted hour meter readings
CREATE TABLE IF NOT EXISTS public.ft_portal_hmr_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id uuid        NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  machine_sn        text        NOT NULL,
  machine_name      text,
  is_own_machine    boolean     NOT NULL DEFAULT false,
  log_date          date        NOT NULL DEFAULT CURRENT_DATE,
  hmr_reading       numeric(10,1) NOT NULL CHECK (hmr_reading >= 0),
  operator_name     text,
  notes             text,
  created_at        timestamptz DEFAULT now()
);

-- 3. CUSTOMER'S OWN MACHINES — non-Fleetrack machines they already own
CREATE TABLE IF NOT EXISTS public.ft_portal_customer_machines (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id    uuid        NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  make                 text        NOT NULL,
  model                text        NOT NULL,
  serial_number        text,
  year                 integer,
  nickname             text,
  machine_type         text,
  current_hmr          numeric(10,1),
  last_service_hmr     numeric(10,1),
  service_interval_hrs numeric(6,1) NOT NULL DEFAULT 250,
  fuel_type            text        NOT NULL DEFAULT 'Diesel',
  is_active            boolean     NOT NULL DEFAULT true,
  created_at           timestamptz DEFAULT now()
);

-- 4. EXTEND existing machine assignments with service tracking per machine
ALTER TABLE public.ft_portal_machine_assignments
  ADD COLUMN IF NOT EXISTS last_service_hmr     numeric(10,1),
  ADD COLUMN IF NOT EXISTS service_interval_hrs  numeric(6,1) DEFAULT 250,
  ADD COLUMN IF NOT EXISTS current_hmr_override  numeric(10,1);

-- RLS: disabled — app-level filtering on portal_account_id in all queries
ALTER TABLE public.ft_portal_fuel_logs           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_hmr_logs            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_customer_machines   DISABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fuel_logs_account  ON public.ft_portal_fuel_logs(portal_account_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_machine  ON public.ft_portal_fuel_logs(machine_sn, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_hmr_logs_account   ON public.ft_portal_hmr_logs(portal_account_id);
CREATE INDEX IF NOT EXISTS idx_hmr_logs_machine   ON public.ft_portal_hmr_logs(machine_sn, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_own_machines_acct  ON public.ft_portal_customer_machines(portal_account_id);
