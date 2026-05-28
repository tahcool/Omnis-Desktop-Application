-- Phase 4 Migration: Inspection Service Reports and Field Service Planner

-- 1. Field Service Plan Table
CREATE TABLE public.ft_service_plan (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id text REFERENCES public.ft_machine(name),
    customer text,
    region text,
    raw_date text, -- Storing as ISO string to match frontend logic
    status text DEFAULT 'Proposed', -- Proposed, Planned, In Progress, Completed
    technician text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ft_service_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_service_plan" ON public.ft_service_plan FOR ALL USING (true) WITH CHECK (true);

-- 2. Inspection Service Report (Archived Reports)
CREATE TABLE public.ft_service_report (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id text REFERENCES public.ft_machine(name),
    report_type text DEFAULT 'ISR',
    title text,
    region text,
    customer text,
    signatories text,
    form_data jsonb, -- Stores nested checklist and fields data
    file_url text, -- Supabase Storage URL
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ft_service_report ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_service_report" ON public.ft_service_report FOR ALL USING (true) WITH CHECK (true);

-- 3. Storage Bucket Configuration (reports)
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'reports' bucket
CREATE POLICY "Allow public access to read reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'reports');

CREATE POLICY "Allow public access to insert reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Allow public access to update reports"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reports');

CREATE POLICY "Allow public access to delete reports"
ON storage.objects FOR DELETE
USING (bucket_id = 'reports');
