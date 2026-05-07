-- =============================================================
-- Product Support Visits (PSV) — Supabase Migration
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. PSV Logs (main record)
CREATE TABLE IF NOT EXISTS psv_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_date              DATE NOT NULL,
    salesperson             TEXT NOT NULL,          -- Logged-in user name
    customer                TEXT NOT NULL,          -- Customer name (from Frappe/Supabase)
    customer_frappe_id      TEXT,                   -- Frappe customer doc name for reference
    machine_name            TEXT,                   -- Fleetrack FT Machine doc name
    machine_model           TEXT,                   -- Denormalised for display speed
    machine_sn              TEXT,                   -- Serial number
    machine_fleet_no        TEXT,                   -- Fleet number
    machine_oem             TEXT,                   -- Brand/OEM
    machine_location        TEXT,                   -- Last known location from Fleetrack
    overall_condition       TEXT NOT NULL DEFAULT 'Good', -- Good | Fair | Poor | Critical
    findings                TEXT,                   -- Free-text observations
    action_required         BOOLEAN DEFAULT FALSE,  -- Does Fleetrack team need to act?
    action_notes            TEXT,                   -- Specific action requested
    fleetrack_notified      BOOLEAN DEFAULT FALSE,  -- Set TRUE after email sent
    fleetrack_notified_at   TIMESTAMP WITH TIME ZONE,
    customer_email_sent     BOOLEAN DEFAULT FALSE,  -- Set TRUE after customer email dispatched
    customer_email_sent_at  TIMESTAMP WITH TIME ZONE,
    customer_email_to       TEXT,                   -- Recipient email(s) logged for audit
    status                  TEXT NOT NULL DEFAULT 'Submitted', -- Submitted | Acknowledged | Closed
    notes                   TEXT,                   -- Internal notes
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. PSV Attachments (photos / docs uploaded per visit)
CREATE TABLE IF NOT EXISTS psv_attachments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psv_id      UUID NOT NULL REFERENCES psv_logs(id) ON DELETE CASCADE,
    file_name   TEXT NOT NULL,
    file_url    TEXT NOT NULL,   -- Supabase Storage public URL
    file_type   TEXT,            -- image/jpeg, application/pdf, etc.
    file_size   INTEGER,         -- bytes
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. RLS
ALTER TABLE psv_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE psv_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON psv_logs        FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON psv_attachments FOR ALL TO authenticated USING (true);

-- 4. Auto-update timestamp trigger (reuses existing function)
CREATE TRIGGER update_psv_logs_modtime
    BEFORE UPDATE ON psv_logs
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 5. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_psv_logs_customer      ON psv_logs (customer);
CREATE INDEX IF NOT EXISTS idx_psv_logs_salesperson   ON psv_logs (salesperson);
CREATE INDEX IF NOT EXISTS idx_psv_logs_visit_date    ON psv_logs (visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_psv_logs_status        ON psv_logs (status);
CREATE INDEX IF NOT EXISTS idx_psv_attachments_psv    ON psv_attachments (psv_id);

-- 6. Storage bucket (run separately OR via Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('psv-attachments', 'psv-attachments', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for authenticated users
-- INSERT INTO storage.policies (name, bucket_id, definition, check_expression, roles, command)
-- VALUES (
--   'Authenticated users can upload PSV attachments',
--   'psv-attachments',
--   'true', 'true', '{authenticated}', 'INSERT'
-- );
