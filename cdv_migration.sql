-- =============================================================
-- Customer Visits (CDV) — Supabase Migration
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. CDV Schedules (Round Robin targets for the week)
CREATE TABLE IF NOT EXISTS cdv_schedules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date     DATE NOT NULL,          -- Monday of the scheduled week
    salesperson         TEXT NOT NULL,          -- Logged-in user name
    customer            TEXT NOT NULL,          -- Customer name
    customer_frappe_id  TEXT,                   -- Frappe customer doc name
    status              TEXT NOT NULL DEFAULT 'Scheduled', -- Scheduled | Completed
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE(week_start_date, salesperson, customer_frappe_id)
);

-- 2. CDV Logs (The actual visit record)
CREATE TABLE IF NOT EXISTS cdv_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_date          DATE NOT NULL,
    schedule_id         UUID REFERENCES cdv_schedules(id) ON DELETE SET NULL, -- Link to schedule if applicable
    salesperson         TEXT NOT NULL,          
    customer            TEXT NOT NULL,          
    customer_frappe_id  TEXT,                   
    topics_discussed    TEXT,                   -- Free-text
    potential_issues    TEXT,                   -- Free-text
    opportunities       TEXT,                   -- Free-text
    action_required     BOOLEAN DEFAULT FALSE,  
    action_notes        TEXT,                   
    status              TEXT NOT NULL DEFAULT 'Submitted',
    notes               TEXT,                   -- Internal notes
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. CDV Attachments (photos / docs uploaded per visit)
CREATE TABLE IF NOT EXISTS cdv_attachments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cdv_id      UUID NOT NULL REFERENCES cdv_logs(id) ON DELETE CASCADE,
    file_name   TEXT NOT NULL,
    file_url    TEXT NOT NULL,   -- Supabase Storage public URL
    file_type   TEXT,            
    file_size   INTEGER,         
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 4. RLS Policies
ALTER TABLE cdv_schedules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdv_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdv_attachments ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (assuming app-level security for now, adjust as needed)
CREATE POLICY "Allow full access to authenticated users on cdv_schedules" ON cdv_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to authenticated users on cdv_logs" ON cdv_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to authenticated users on cdv_attachments" ON cdv_attachments FOR ALL USING (true) WITH CHECK (true);
