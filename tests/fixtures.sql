-- Test fixtures for email, company isolation, and compensation tests
-- Applied AFTER migrations via direct psql, NOT as a migration file.
-- This matches the exact schema expected by email-submit and process-email-queue EFs.

-- Email queue columns (table already exists from stub migration with id + created_at)
ALTER TABLE omnis_email_queue
  ADD COLUMN IF NOT EXISTS system TEXT NOT NULL DEFAULT 'fleetrack',
  ADD COLUMN IF NOT EXISTS to_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS to_name TEXT,
  ADD COLUMN IF NOT EXISTS cc_email TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_html TEXT,
  ADD COLUMN IF NOT EXISTS body_text TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS related_doc TEXT,
  ADD COLUMN IF NOT EXISTS related_type TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS template_id TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_by_id UUID;

-- Drop old global-only unique index if exists
DROP INDEX IF EXISTS omnis_email_queue_idem_key;

-- Create user-scoped idempotency unique index
CREATE UNIQUE INDEX IF NOT EXISTS omnis_email_queue_user_idem_key
  ON omnis_email_queue(created_by_id, idempotency_key)
  WHERE created_by_id IS NOT NULL AND idempotency_key IS NOT NULL;

-- Lookup index for idempotency key queries
CREATE INDEX IF NOT EXISTS omnis_email_queue_idem_lookup
  ON omnis_email_queue(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Email config table (matches email-submit + process-email-queue usage)
CREATE TABLE IF NOT EXISTS omnis_email_config (
  system TEXT PRIMARY KEY,
  smtp_host TEXT NOT NULL DEFAULT 'smtp.office365.com',
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_user TEXT,
  smtp_pass TEXT,
  from_name TEXT DEFAULT 'Omnis',
  use_tls BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE omnis_email_config ENABLE ROW LEVEL SECURITY;

INSERT INTO omnis_email_config (system, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, use_tls)
VALUES ('fleetrack', 'localhost', 1025, 'test@omnis.local', 'test-pass-not-real', 'Omnis Test', true)
ON CONFLICT (system) DO NOTHING;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
