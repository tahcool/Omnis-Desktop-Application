-- ============================================================
-- Portal Extensions: Breakdowns, Rentals & Operators
-- Run in: https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql/new
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. OPERATORS — customer's operator register
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ft_portal_operators (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id   uuid        NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  full_name           text        NOT NULL,
  phone               text,
  id_number           text,
  license_number      text,
  license_type        text,        -- CE / BE / Crane / Earthmover / Other
  experience_years    integer,
  is_active           boolean     NOT NULL DEFAULT true,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operators_account ON public.ft_portal_operators(portal_account_id);
ALTER TABLE public.ft_portal_operators DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────
-- 2. OPERATOR ASSIGNMENTS — operator ↔ machine pairings
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ft_portal_operator_assignments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id   uuid        NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  operator_id         uuid        NOT NULL REFERENCES public.ft_portal_operators(id) ON DELETE CASCADE,
  machine_sn          text        NOT NULL,
  machine_name        text,
  assigned_date       date        NOT NULL DEFAULT CURRENT_DATE,
  unassigned_date     date,               -- NULL = currently assigned
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_assignments_account  ON public.ft_portal_operator_assignments(portal_account_id);
CREATE INDEX IF NOT EXISTS idx_op_assignments_operator ON public.ft_portal_operator_assignments(operator_id);
CREATE INDEX IF NOT EXISTS idx_op_assignments_machine  ON public.ft_portal_operator_assignments(machine_sn);
ALTER TABLE public.ft_portal_operator_assignments DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────
-- 3. BREAKDOWN REPORTS — customer-submitted machine breakdowns
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ft_portal_breakdown_reports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id   uuid        NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  machine_sn          text        NOT NULL,
  machine_name        text,
  is_own_machine      boolean     NOT NULL DEFAULT false,
  reported_date       date        NOT NULL DEFAULT CURRENT_DATE,
  breakdown_type      text,       -- Engine / Hydraulic / Electrical / Structural / Other
  description         text        NOT NULL,
  operator_id         uuid        REFERENCES public.ft_portal_operators(id) ON DELETE SET NULL,
  operator_name       text,
  severity            text        NOT NULL DEFAULT 'Major',  -- Critical / Major / Minor
  status              text        NOT NULL DEFAULT 'Open',   -- Open / In Progress / Resolved
  resolved_date       date,
  admin_notes         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_breakdowns_account ON public.ft_portal_breakdown_reports(portal_account_id);
CREATE INDEX IF NOT EXISTS idx_breakdowns_status  ON public.ft_portal_breakdown_reports(status);
CREATE INDEX IF NOT EXISTS idx_breakdowns_machine ON public.ft_portal_breakdown_reports(machine_sn);
ALTER TABLE public.ft_portal_breakdown_reports DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────
-- 4. RENTALS — rental periods with utilization tracking
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ft_portal_rentals (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_account_id   uuid        NOT NULL REFERENCES public.ft_customer_portal_accounts(id) ON DELETE CASCADE,
  machine_sn          text        NOT NULL,
  machine_name        text,
  is_own_machine      boolean     NOT NULL DEFAULT false,
  project_name        text,
  start_date          date        NOT NULL DEFAULT CURRENT_DATE,
  end_date            date,               -- NULL = currently active rental
  rate                numeric(10,2),      -- NULL = no billing tracking
  rate_unit           text        DEFAULT 'per_day',  -- per_day / per_hour / per_month
  operator_id         uuid        REFERENCES public.ft_portal_operators(id) ON DELETE SET NULL,
  operator_name       text,
  status              text        NOT NULL DEFAULT 'Active',  -- Active / Completed / Upcoming
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rentals_account ON public.ft_portal_rentals(portal_account_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status  ON public.ft_portal_rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_machine ON public.ft_portal_rentals(machine_sn);
ALTER TABLE public.ft_portal_rentals DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────
-- Verify all tables created
-- ─────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'ft_portal_operators',
    'ft_portal_operator_assignments',
    'ft_portal_breakdown_reports',
    'ft_portal_rentals'
  )
ORDER BY table_name;
