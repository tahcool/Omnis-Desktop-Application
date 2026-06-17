-- ============================================================
-- Omnis Email System — Supabase Tables
-- Run once against your Supabase project.
-- ============================================================

-- ── 1. SMTP Configuration ────────────────────────────────────
CREATE TABLE IF NOT EXISTS omnis_email_config (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  system      text        NOT NULL DEFAULT 'fleetrack',
  smtp_host   text        NOT NULL DEFAULT 'smtp.office365.com',
  smtp_port   integer     NOT NULL DEFAULT 587,
  smtp_user   text        NOT NULL,
  smtp_pass   text        NOT NULL,
  from_name   text        NOT NULL DEFAULT 'Omnis',
  use_tls     boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system)
);

-- ── 2. Email Queue ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS omnis_email_queue (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  system         text        NOT NULL DEFAULT 'fleetrack',
  to_email       text        NOT NULL,   -- comma-separated for multiple recipients
  to_name        text,
  cc_email       text,
  subject        text        NOT NULL,
  body_html      text        NOT NULL,
  body_text      text,
  status         text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','sent','failed','cancelled')),
  scheduled_for  timestamptz NOT NULL DEFAULT now(),
  sent_at        timestamptz,
  error_message  text,
  retry_count    integer     NOT NULL DEFAULT 0,
  related_doc    text,        -- e.g. machine serial, breakdown name
  related_type   text,        -- 'machine' | 'breakdown' | 'customer' | 'manual'
  template_id    text,        -- for template tracking
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── 3. RLS — service-role access only ────────────────────────
ALTER TABLE omnis_email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE omnis_email_queue  ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Electron main process uses service role key)
CREATE POLICY "service_role_all_config" ON omnis_email_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_queue" ON omnis_email_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 4. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
  ON omnis_email_queue (status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_created_at
  ON omnis_email_queue (created_at DESC);

-- ── 5. Auto-update updated_at on config changes ───────────────
CREATE OR REPLACE FUNCTION update_email_config_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_config_updated_at ON omnis_email_config;
CREATE TRIGGER trg_email_config_updated_at
  BEFORE UPDATE ON omnis_email_config
  FOR EACH ROW EXECUTE FUNCTION update_email_config_timestamp();
