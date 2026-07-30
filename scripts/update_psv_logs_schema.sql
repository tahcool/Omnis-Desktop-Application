-- ============================================================
-- Update psv_logs & cdv_logs table schema for notifications & photos
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.cdv_logs
    ADD COLUMN IF NOT EXISTS topics_discussed     TEXT,
    ADD COLUMN IF NOT EXISTS opportunities        TEXT,
    ADD COLUMN IF NOT EXISTS images               TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS cc_companies         TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS cc_emails            TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS customer_email_to    TEXT,
    ADD COLUMN IF NOT EXISTS customer_email_sent  BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS customer_email_sent_at TIMESTAMPTZ;

ALTER TABLE public.psv_logs
    ADD COLUMN IF NOT EXISTS topics_discussed     TEXT,
    ADD COLUMN IF NOT EXISTS opportunities        TEXT,
    ADD COLUMN IF NOT EXISTS machines_inspected   JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS target_departments   TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS cc_companies         TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS cc_emails            TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS images               TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS customer_email_to    TEXT,
    ADD COLUMN IF NOT EXISTS customer_email_sent  BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS customer_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.cdv_logs.images IS 'Uploaded photo URLs for CDV visit';
COMMENT ON COLUMN public.psv_logs.images IS 'Uploaded photo URLs for PSV visit';
COMMENT ON COLUMN public.cdv_logs.customer_email_to IS 'Recipient customer email(s) separated by comma for auto dispatch';
COMMENT ON COLUMN public.psv_logs.customer_email_to IS 'Recipient customer email(s) separated by comma for auto dispatch';
