-- Migration: 20260803000000_ft_technician_hour_log.sql
-- Description: Create table for tracking FT Technician Hour Logs migrated from Frappe.

CREATE TABLE IF NOT EXISTS public.ft_technician_hour_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    frappe_name TEXT UNIQUE,
    technician TEXT NOT NULL,
    date DATE NOT NULL,
    productive NUMERIC DEFAULT 0.0,
    travel NUMERIC DEFAULT 0.0,
    admin NUMERIC DEFAULT 0.0,
    house_keeping NUMERIC DEFAULT 0.0,
    non_productive NUMERIC DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.ft_technician_hour_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access to ft_technician_hour_log" ON public.ft_technician_hour_log;
CREATE POLICY "Allow authenticated read access to ft_technician_hour_log"
  ON public.ft_technician_hour_log FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to ft_technician_hour_log" ON public.ft_technician_hour_log;
CREATE POLICY "Allow authenticated insert to ft_technician_hour_log"
  ON public.ft_technician_hour_log FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to ft_technician_hour_log" ON public.ft_technician_hour_log;
CREATE POLICY "Allow authenticated update to ft_technician_hour_log"
  ON public.ft_technician_hour_log FOR UPDATE 
TO authenticated 
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ft_technician_hour_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ft_technician_hour_log_updated_at ON public.ft_technician_hour_log;
CREATE TRIGGER update_ft_technician_hour_log_updated_at
    BEFORE UPDATE ON public.ft_technician_hour_log
    FOR EACH ROW
    EXECUTE FUNCTION update_ft_technician_hour_log_updated_at();
