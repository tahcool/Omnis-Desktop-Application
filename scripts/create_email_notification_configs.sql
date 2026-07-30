-- ============================================================
-- email_notification_configs – Configurable email recipients
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_notification_configs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category    TEXT NOT NULL, -- 'department' | 'company_cc'
    name        TEXT NOT NULL UNIQUE, -- 'Fleetrack', 'Engineering', 'Parts', 'Machinery Exchange', 'Sinopower'
    emails      TEXT[] NOT NULL,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial department & company recipient lists
INSERT INTO public.email_notification_configs (category, name, emails)
VALUES 
    ('department', 'Fleetrack', ARRAY[
        'barry@industrial-exchange.group',
        'mxgfleetrack.brighton@machinery-exchange.com',
        'mxgfleetrack.bruce@machinery-exchange.com'
    ]),
    ('department', 'Engineering', ARRAY[
        'engineering.clive@machinery-exchange.com'
    ]),
    ('department', 'Parts', ARRAY[
        'parts.gilbert@machinery-exchange.com',
        'parts.arnold@machinery-exchange.com',
        'parts.david@machinery-exchange.com'
    ]),
    ('company_cc', 'Machinery Exchange', ARRAY[
        'equipment@machinery-exchange.com',
        'sales.humphrey@machinery-exchange.com',
        'louis@industrial-exchange.group',
        'mathew@industrial-exchange.group',
        'rutendo@industrial-exchange.group',
        'brendan@industrial-exchange.group',
        'chetan.samji@machinery-exchange.com',
        'antony@industrial-exchange.group'
    ]),
    ('company_cc', 'Sinopower', ARRAY[
        'antony@industrial-exchange.group',
        'brendan@industrial-exchange.group',
        'jamie@sinopower.co.zw',
        'rutendo@industrial-exchange.group',
        'mathew@industrial-exchange.group',
        'louis@industrial-exchange.group'
    ])
ON CONFLICT (name) 
DO UPDATE SET 
    emails = EXCLUDED.emails,
    updated_at = NOW();

-- RLS Security
ALTER TABLE public.email_notification_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to email configs" 
    ON public.email_notification_configs 
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update to email configs" 
    ON public.email_notification_configs 
    FOR UPDATE USING (true);
