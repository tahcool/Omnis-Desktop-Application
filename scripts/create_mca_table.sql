-- ============================================================
-- Machine Condition Assessment (MCA) Table
-- Run in: https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql/new
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. MCA RECORDS — one row per inspection
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ft_mca (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Header / identification
  machine_name          text        NOT NULL,   -- ft_machine.name
  machine_sn            text,                   -- auto-populated serial number
  machine_model         text,                   -- auto-populated model
  engine_make_esn       text,                   -- auto-populated from machine
  customer_name         text,                   -- linked customer name
  job_no                text,
  hourmeter             numeric(10,1),          -- current HMR from system at time of assessment
  date_of_inspection    date        NOT NULL DEFAULT CURRENT_DATE,
  technician_name       text        NOT NULL,   -- picked from ft_service_plan technician list
  site_of_inspection    text,

  -- JSONB checklist (all 10 sections, each item: { checked: bool, comments: text })
  inspection_data       jsonb       NOT NULL DEFAULT '{}',

  -- Footer / sign-off
  comments              text,                   -- general comments
  mxg_technician_name   text,
  mxg_technician_date   date,
  mxg_technician_sign   text,
  csd_manager_name      text,
  csd_manager_date      date,
  csd_manager_sign      text,

  -- Photo URLs (stored in Supabase Storage bucket: mca-photos)
  photo_data_plate      text,                   -- URL
  photo_engine_plate    text,                   -- URL
  photo_hourmeter       text,                   -- URL
  photo_failed_comps    text,                   -- URL (can store comma-separated for multiple)

  -- Workflow
  status                text        NOT NULL DEFAULT 'Draft'
                          CHECK (status IN ('Draft', 'Submitted', 'Approved')),

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- 2. INDEXES
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ft_mca_machine    ON public.ft_mca(machine_name);
CREATE INDEX IF NOT EXISTS idx_ft_mca_status     ON public.ft_mca(status);
CREATE INDEX IF NOT EXISTS idx_ft_mca_date       ON public.ft_mca(date_of_inspection DESC);
CREATE INDEX IF NOT EXISTS idx_ft_mca_technician ON public.ft_mca(technician_name);

-- ─────────────────────────────────────────────────────────
-- 3. RLS — disabled (app uses service role key, same as all other ft_ tables)
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.ft_mca DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────
-- 4. UPDATED_AT trigger helper
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ft_mca_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ft_mca_updated_at ON public.ft_mca;
CREATE TRIGGER trg_ft_mca_updated_at
  BEFORE UPDATE ON public.ft_mca
  FOR EACH ROW EXECUTE FUNCTION public.ft_mca_set_updated_at();

-- ─────────────────────────────────────────────────────────
-- 5. STORAGE BUCKET — mca-photos (run ONCE)
-- ─────────────────────────────────────────────────────────
-- Run this in Supabase dashboard Storage → New Bucket
-- Name: mca-photos
-- Public: false (admin-only access via service role)
-- OR create via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('mca-photos', 'mca-photos', false)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 6. VERIFY
-- ─────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'ft_mca';
