-- =========================================================
-- Marketing System Migration — Run once in Supabase SQL Editor
-- =========================================================

-- 1. Ensure newsletters table exists with all required columns
CREATE TABLE IF NOT EXISTS newsletters (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject             TEXT NOT NULL,
    sender_email        TEXT DEFAULT 'marketing@powerstar.co.zw',
    sender_name         TEXT DEFAULT 'IEG Marketing',
    header_logo_url     TEXT,
    header_bg_color     TEXT DEFAULT '#1e293b',
    header_text_color   TEXT DEFAULT '#ffffff',
    blocks              JSONB DEFAULT '[]'::jsonb,
    html_content        TEXT,
    whatsapp_message    TEXT,
    channels            JSONB DEFAULT '["email"]'::jsonb,
    segment_type        TEXT DEFAULT 'all',
    segment_value       TEXT,
    status              TEXT NOT NULL DEFAULT 'Draft',
    total_audience      INTEGER DEFAULT 0,
    successful_sends    INTEGER DEFAULT 0,
    created_by          TEXT,
    sent_at             TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'newsletters'
        AND policyname = 'Allow full access to authenticated users on newsletters'
    ) THEN
        CREATE POLICY "Allow full access to authenticated users on newsletters"
            ON newsletters FOR ALL USING (true) WITH CHECK (true);
    END IF;
END$$;

-- 2. Campaign Recipients — per-recipient tracking
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID REFERENCES newsletters(id) ON DELETE CASCADE,
    contact_name    TEXT,
    email           TEXT,
    phone           TEXT,
    channel         TEXT,
    status          TEXT DEFAULT 'pending',
    error_msg       TEXT,
    sent_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'campaign_recipients'
        AND policyname = 'Allow full access on campaign_recipients'
    ) THEN
        CREATE POLICY "Allow full access on campaign_recipients"
            ON campaign_recipients FOR ALL USING (true) WITH CHECK (true);
    END IF;
END$$;

-- 3. Add unsubscribed flag to order_contacts if missing
ALTER TABLE order_contacts
    ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_order_contacts_unsubscribed ON order_contacts(unsubscribed);

-- =========================================================
-- Phase 2 Additions — Run after initial migration
-- =========================================================

-- 5. Newsletter: editor mode + scheduling
ALTER TABLE newsletters
    ADD COLUMN IF NOT EXISTS editor_mode   TEXT DEFAULT 'blocks',   -- 'blocks' | 'html' | 'template'
    ADD COLUMN IF NOT EXISTS scheduled_at  TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS template_id   TEXT;                    -- which template was used

-- 6. Contact tags (text array for flexible tagging)
ALTER TABLE order_contacts
    ADD COLUMN IF NOT EXISTS tags          TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS notes         TEXT,
    ADD COLUMN IF NOT EXISTS contact_type  TEXT DEFAULT 'customer';  -- customer | supplier | partner

-- 7. Campaign recipients: analytics hooks
ALTER TABLE campaign_recipients
    ADD COLUMN IF NOT EXISTS opened_at     TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS clicked_at    TIMESTAMP WITH TIME ZONE;

-- 8. Campaign scheduling index
CREATE INDEX IF NOT EXISTS idx_newsletters_scheduled
    ON newsletters(scheduled_at)
    WHERE status = 'Scheduled';

-- 9. Contact tags index (GIN for array containment queries)
CREATE INDEX IF NOT EXISTS idx_order_contacts_tags
    ON order_contacts USING GIN(tags);

