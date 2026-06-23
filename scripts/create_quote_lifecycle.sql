CREATE TABLE IF NOT EXISTS public.omnis_quote_lifecycle (
    quote_name varchar PRIMARY KEY REFERENCES public.frappe_quotation(name),
    created_on timestamp with time zone,
    
    stage_1_due date,
    stage_1_logged_at timestamp with time zone,
    stage_1_notes text,
    stage_1_late_reason text,
    
    stage_2_due date,
    stage_2_logged_at timestamp with time zone,
    stage_2_notes text,
    stage_2_late_reason text,
    
    stage_3_due date,
    stage_3_logged_at timestamp with time zone,
    stage_3_notes text,
    stage_3_late_reason text,
    
    current_stage integer DEFAULT 1,
    is_closed boolean DEFAULT false,
    closing_reason varchar,
    manager_signoff_status varchar DEFAULT 'pending',
    manager_notes text
);

-- Enable RLS
ALTER TABLE public.omnis_quote_lifecycle ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and update
CREATE POLICY "Allow all on omnis_quote_lifecycle"
    ON public.omnis_quote_lifecycle
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow anon for edge functions
CREATE POLICY "Allow anon select on omnis_quote_lifecycle"
    ON public.omnis_quote_lifecycle
    FOR SELECT
    TO anon
    USING (true);
