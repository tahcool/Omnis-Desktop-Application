-- Migration: Email idempotency scoping and payload conflict detection
--
-- The stub migration (20260620000000) creates omnis_email_queue with only
-- id + created_at. This migration adds ALL operational columns needed by
-- email-submit and process-email-queue, plus the idempotency improvements.
--
-- Idempotency fix:
-- 1. payload_hash for canonical payload comparison (same key + diff payload → 409).
-- 2. created_by_id (UUID) for stable user-scoped uniqueness.
-- 3. Composite unique index (created_by_id, idempotency_key) instead of global.

-- Step 1: Add all operational columns
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

-- Step 2: Conditionally backfill created_by_id from existing created_by values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM omnis_email_queue WHERE created_by IS NOT NULL AND created_by_id IS NULL LIMIT 1
  ) THEN
    EXECUTE '
      UPDATE omnis_email_queue eq
      SET created_by_id = au.id
      FROM auth.users au
      WHERE eq.created_by_id IS NULL
        AND eq.created_by IS NOT NULL
        AND lower(au.email) = lower(eq.created_by)
    ';
  END IF;
END $$;

-- Step 3: Drop any old global unique index on idempotency_key
DROP INDEX IF EXISTS omnis_email_queue_idem_key;

-- Step 4: Create new composite unique index scoped by user
CREATE UNIQUE INDEX IF NOT EXISTS omnis_email_queue_user_idem_key
  ON omnis_email_queue(created_by_id, idempotency_key)
  WHERE created_by_id IS NOT NULL AND idempotency_key IS NOT NULL;

-- Step 5: Lookup index for idempotency queries
CREATE INDEX IF NOT EXISTS omnis_email_queue_idem_lookup
  ON omnis_email_queue(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN omnis_email_queue.payload_hash IS
  'SHA-256 hex of canonical payload. Used for 409 conflict detection on idempotency key reuse.';
COMMENT ON COLUMN omnis_email_queue.created_by_id IS
  'UUID of the authenticated user. Used for user-scoped idempotency and ownership.';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
