-- Phase 1b: Fix existing tables and create missing ones
-- Adds missing columns to fmb_reports, creates gsm_tasks and stock_pipeline

-- ── fmb_reports: add missing columns ────────────────────────────────────────
ALTER TABLE fmb_reports
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS machine       TEXT,
  ADD COLUMN IF NOT EXISTS modified      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS synced_at     TIMESTAMPTZ DEFAULT now();

-- Backfill customer_name from customer_id (they hold the same value in older data)
UPDATE fmb_reports SET customer_name = customer_id WHERE customer_name IS NULL AND customer_id IS NOT NULL;

-- ── gsm_tasks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gsm_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frappe_id     TEXT UNIQUE NOT NULL,
  assignee      TEXT,
  task          TEXT,
  date_assigned DATE,
  ted           DATE,
  comment       TEXT,
  status        TEXT,
  category      TEXT,
  is_urgent     BOOLEAN DEFAULT FALSE,
  owner         TEXT,
  synced_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gsm_tasks_assignee ON gsm_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_gsm_tasks_status   ON gsm_tasks(status);

ALTER TABLE gsm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read gsm_tasks"
  ON gsm_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access gsm_tasks"
  ON gsm_tasks FOR ALL TO service_role USING (true);

-- ── stock_pipeline ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_pipeline (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frappe_id           TEXT UNIQUE NOT NULL,
  machine             TEXT,
  brand               TEXT,
  model               TEXT,
  serial_no           TEXT,
  status              TEXT,
  eta                 DATE,
  port_of_origin      TEXT,
  destination         TEXT,
  notes               TEXT,
  owner               TEXT,
  potential_customers JSONB DEFAULT '[]',
  synced_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_pipeline_status ON stock_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_stock_pipeline_brand  ON stock_pipeline(brand);

ALTER TABLE stock_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock_pipeline"
  ON stock_pipeline FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access stock_pipeline"
  ON stock_pipeline FOR ALL TO service_role USING (true);
