-- Migration: Centralised customer contacts
-- Stores email & WhatsApp contacts per customer_name,
-- shared across Quotations and Order Tracking.
-- No hard constraint on email/WhatsApp — UI shows warnings for missing data.

CREATE TABLE IF NOT EXISTS public.omnis_customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    whatsapp_number TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_customer_name ON public.omnis_customer_contacts(customer_name);
CREATE INDEX IF NOT EXISTS idx_cc_primary ON public.omnis_customer_contacts(customer_name, is_primary) WHERE is_primary = true;

-- RLS: Full access for authenticated users
ALTER TABLE public.omnis_customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to omnis_customer_contacts"
    ON public.omnis_customer_contacts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
