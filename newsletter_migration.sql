-- =============================================================
-- Marketing Newsletters — Supabase Migration
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Newsletters Table
CREATE TABLE IF NOT EXISTS newsletters (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject             TEXT NOT NULL,
    sender_email        TEXT DEFAULT 'marketing@powerstar.co.zw',
    blocks              JSONB DEFAULT '[]'::jsonb,   -- Stores the drag-and-drop block definitions
    html_content        TEXT,                        -- The final compiled HTML payload
    status              TEXT NOT NULL DEFAULT 'Draft', -- Draft | Sending | Sent
    total_audience      INTEGER DEFAULT 0,
    successful_sends    INTEGER DEFAULT 0,
    created_by          TEXT,
    sent_at             TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. RLS Policies
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write for now
CREATE POLICY "Allow full access to authenticated users on newsletters" ON newsletters FOR ALL USING (true) WITH CHECK (true);
