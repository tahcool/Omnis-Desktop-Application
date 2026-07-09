-- Run in Supabase SQL Editor
-- Tracks when an overdue reminder email was last dispatched for a quote

ALTER TABLE public.omnis_quote_lifecycle
ADD COLUMN IF NOT EXISTS last_overdue_reminder_sent_at timestamp with time zone DEFAULT NULL;
