-- ============================================================
--  ft_defect  –  Defects Register
--  Migrated from Frappe ft_defects_dashboard
--  Run once in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ft_defect (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT UNIQUE,                    -- Frappe-style doc ID (auto-gen if null)
  order_id      TEXT,                           -- Linked Order ID from Salestrack
  machine       TEXT,                           -- Machine SN / identifier
  model         TEXT,                           -- Machine model name
  customer      TEXT,
  region        TEXT,
  location      TEXT,
  description   TEXT NOT NULL,
  image_url     TEXT,                           -- Optional photo of defect
  defect_type   TEXT DEFAULT 'Minor',           -- Minor | Major | Critical
  priority      TEXT DEFAULT 'Low',             -- Low | Medium | High
  status        TEXT DEFAULT 'Open',            -- Open | WIP | On Hold | Closed
  technician    TEXT,
  oem           TEXT,                           -- OEM contact / reference
  start_date    DATE DEFAULT CURRENT_DATE,
  closed_date   DATE,
  due_date      DATE,
  creation      TIMESTAMPTZ DEFAULT NOW(),
  modified      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate a friendly name if not provided
CREATE OR REPLACE FUNCTION ft_defect_set_name()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := 'DEF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
  END IF;
  NEW.modified := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ft_defect_name ON public.ft_defect;
CREATE TRIGGER trg_ft_defect_name
  BEFORE INSERT OR UPDATE ON public.ft_defect
  FOR EACH ROW EXECUTE FUNCTION ft_defect_set_name();

-- Indexes
CREATE INDEX IF NOT EXISTS ft_defect_machine_idx   ON public.ft_defect (machine);
CREATE INDEX IF NOT EXISTS ft_defect_status_idx    ON public.ft_defect (status);
CREATE INDEX IF NOT EXISTS ft_defect_priority_idx  ON public.ft_defect (priority);
CREATE INDEX IF NOT EXISTS ft_defect_start_date_idx ON public.ft_defect (start_date DESC);

-- RLS (service-role key bypasses all policies — safe for Electron app)
ALTER TABLE public.ft_defect ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.ft_defect
  USING (true) WITH CHECK (true);
