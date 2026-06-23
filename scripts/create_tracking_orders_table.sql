CREATE TABLE IF NOT EXISTS public.omnis_tracking_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer TEXT NOT NULL,
    machine TEXT NOT NULL,
    qty INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Internal Tracking',
    notes TEXT,
    internal_notes TEXT,
    target_handover DATE,
    company TEXT DEFAULT 'Unassigned',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Allow all access for now (similar to fmb_reports)
ALTER TABLE public.omnis_tracking_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.omnis_tracking_orders
    AS PERMISSIVE FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Enable insert access for all users" ON public.omnis_tracking_orders
    AS PERMISSIVE FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.omnis_tracking_orders
    AS PERMISSIVE FOR UPDATE
    TO public
    USING (true);

CREATE POLICY "Enable delete access for all users" ON public.omnis_tracking_orders
    AS PERMISSIVE FOR DELETE
    TO public
    USING (true);

-- Add missing columns for syncing sales and manual updates
ALTER TABLE public.omnis_tracking_orders 
    ADD COLUMN IF NOT EXISTS linked_sale_name TEXT,
    ADD COLUMN IF NOT EXISTS brand TEXT,
    ADD COLUMN IF NOT EXISTS model TEXT,
    ADD COLUMN IF NOT EXISTS order_date DATE,
    ADD COLUMN IF NOT EXISTS committed_lead_time TEXT,
    ADD COLUMN IF NOT EXISTS revised_handover DATE;

