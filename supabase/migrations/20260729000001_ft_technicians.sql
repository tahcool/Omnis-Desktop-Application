-- Migration: 20260729000001_ft_technicians.sql
-- Description: Create table to track FT Technicians synced from Frappe.

CREATE TABLE IF NOT EXISTS public.ft_technicians (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    frappe_name TEXT UNIQUE,
    full_name TEXT NOT NULL,
    mobile_phone TEXT,
    site TEXT,
    designation TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.ft_technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access to ft_technicians" ON public.ft_technicians;
CREATE POLICY "Allow authenticated read access to ft_technicians"
  ON public.ft_technicians FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert to ft_technicians" ON public.ft_technicians;
CREATE POLICY "Allow authenticated insert to ft_technicians"
  ON public.ft_technicians FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update to ft_technicians" ON public.ft_technicians;
CREATE POLICY "Allow authenticated update to ft_technicians"
  ON public.ft_technicians FOR UPDATE 
TO authenticated 
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ft_technicians_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ft_technicians_updated_at ON public.ft_technicians;
CREATE TRIGGER update_ft_technicians_updated_at
    BEFORE UPDATE ON public.ft_technicians
    FOR EACH ROW
    EXECUTE FUNCTION update_ft_technicians_updated_at();
