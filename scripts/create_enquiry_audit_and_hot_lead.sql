-- SQL Migration: Enquiry Audit Trail, Hot Lead, Deletion & Quote PDF URL
ALTER TABLE public.customer_enquiries 
ADD COLUMN IF NOT EXISTS is_hot_lead boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text,
ADD COLUMN IF NOT EXISTS deletion_reason text,
ADD COLUMN IF NOT EXISTS pdf_url text,
ADD COLUMN IF NOT EXISTS quote_name text;

CREATE TABLE IF NOT EXISTS public.omnis_audit_trail (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL,
    performed_by text,
    performed_by_name text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.omnis_audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on omnis_audit_trail" ON public.omnis_audit_trail;
CREATE POLICY "Allow all on omnis_audit_trail" ON public.omnis_audit_trail FOR ALL USING (true) WITH CHECK (true);
