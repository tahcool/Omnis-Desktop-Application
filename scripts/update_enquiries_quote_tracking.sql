-- SQL migration to support enquiry quote tracking and company routing
ALTER TABLE public.customer_enquiries 
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS target_company text,
ADD COLUMN IF NOT EXISTS quote_number text,
ADD COLUMN IF NOT EXISTS quoted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS time_to_quote_seconds numeric,
ADD COLUMN IF NOT EXISTS time_to_quote_display text,
ADD COLUMN IF NOT EXISTS sales_rep_name text;

-- Enable public RLS policies
ALTER TABLE public.customer_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon and authenticated all on customer_enquiries" ON public.customer_enquiries;
CREATE POLICY "Allow anon and authenticated all on customer_enquiries" 
ON public.customer_enquiries 
FOR ALL 
USING (true) 
WITH CHECK (true);
