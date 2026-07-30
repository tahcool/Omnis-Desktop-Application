-- ================================================================
-- Create fmb_report_machines table (safe to run multiple times)
-- Run this in the Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS fmb_report_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL,
  fmb_report_uuid UUID REFERENCES fmb_reports(id) ON DELETE CASCADE,
  machine_id TEXT,
  machine TEXT,
  brand TEXT,
  qty NUMERIC DEFAULT 1,
  status TEXT,
  target_handover DATE,
  revised_handover DATE,
  actual_handover DATE,
  committed_lead_time TEXT,
  notes TEXT,
  internal_notes TEXT,
  days_left INTEGER,
  owner TEXT,
  order_date TIMESTAMPTZ,
  last_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (report_id, machine_id)
);

CREATE INDEX IF NOT EXISTS idx_fmb_machines_report_id ON fmb_report_machines(report_id);

ALTER TABLE fmb_report_machines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fmb_report_machines' AND policyname='Anon can read fmb_report_machines') THEN
    CREATE POLICY "Anon can read fmb_report_machines" ON fmb_report_machines FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fmb_report_machines' AND policyname='Authenticated can read fmb_report_machines') THEN
    CREATE POLICY "Authenticated can read fmb_report_machines" ON fmb_report_machines FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Also create customer_enquiries if it doesn't exist yet
CREATE TABLE IF NOT EXISTS customer_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  request_details TEXT NOT NULL,
  estimated_value NUMERIC DEFAULT 0,
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Open',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_enquiries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_enquiries' AND policyname='Users can view own enquiries') THEN
    CREATE POLICY "Users can view own enquiries" ON customer_enquiries FOR SELECT USING (auth.uid() = submitted_by);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_enquiries' AND policyname='Users can insert enquiries') THEN
    CREATE POLICY "Users can insert enquiries" ON customer_enquiries FOR INSERT WITH CHECK (auth.uid() = submitted_by);
  END IF;
END $$;

-- Allow service role full access for admin viewing on dashboard
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_enquiries' AND policyname='Service role full access enquiries') THEN
    CREATE POLICY "Service role full access enquiries" ON customer_enquiries FOR ALL TO service_role USING (true);
  END IF;
END $$;
