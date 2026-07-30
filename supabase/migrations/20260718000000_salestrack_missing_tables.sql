-- Phase 1: Create missing Salestrack tables in Supabase
-- Migration: 20260718000000_salestrack_missing_tables.sql

-- ── fmb_reports (Order Headers) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fmb_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frappe_id   TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  order_date  DATE,
  status      TEXT,
  company     TEXT,
  machine     TEXT,
  modified    TIMESTAMPTZ,
  synced_at   TIMESTAMPTZ DEFAULT now()
);

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_fmb_reports_status ON fmb_reports(status);
CREATE INDEX IF NOT EXISTS idx_fmb_reports_customer ON fmb_reports(customer_name);

-- ── group_sales ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frappe_id        TEXT UNIQUE NOT NULL,
  customer         TEXT,
  order_date       DATE,
  oem              TEXT,
  model            TEXT,
  machine_condition TEXT,
  qty              NUMERIC DEFAULT 1,
  customer_status  TEXT,
  sector           TEXT,
  salesperson      TEXT,
  company          TEXT,
  committed_lead_time TEXT,
  synced_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_sales_company     ON group_sales(company);
CREATE INDEX IF NOT EXISTS idx_group_sales_order_date  ON group_sales(order_date);
CREATE INDEX IF NOT EXISTS idx_group_sales_salesperson ON group_sales(salesperson);

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

-- ── RLS: Allow authenticated reads ──────────────────────────────────────────
ALTER TABLE fmb_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_sales    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsm_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fmb_reports"
  ON fmb_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read group_sales"
  ON group_sales FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read gsm_tasks"
  ON gsm_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read stock_pipeline"
  ON stock_pipeline FOR SELECT TO authenticated USING (true);

-- Service role can do everything (for sync scripts)
CREATE POLICY "Service role full access fmb_reports"
  ON fmb_reports FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access group_sales"
  ON group_sales FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access gsm_tasks"
  ON gsm_tasks FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access stock_pipeline"
  ON stock_pipeline FOR ALL TO service_role USING (true);
