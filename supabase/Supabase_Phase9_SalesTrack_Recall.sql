-- Omnis SalesTrack Module PRO
-- Supabase Schema Migration (Phase 9)
-- Creating a dedicated tracking table for SalesTrack communications

CREATE TABLE IF NOT EXISTS public.omnis_salestrack_notifications (
    report_id TEXT PRIMARY KEY,
    notified_wa BOOLEAN DEFAULT FALSE,
    notified_email BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Configuration
ALTER TABLE public.omnis_salestrack_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for omnis_salestrack_notifications" ON public.omnis_salestrack_notifications;
CREATE POLICY "Enable full access for omnis_salestrack_notifications" ON public.omnis_salestrack_notifications FOR ALL USING (true) WITH CHECK (true);
