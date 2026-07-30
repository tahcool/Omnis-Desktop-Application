-- Migration: FT Service Logs
-- Description: Creates a table to store the Frappe FT Service Log records for the Machine Details modal

CREATE TABLE IF NOT EXISTS public.ft_service_logs (
    id TEXT PRIMARY KEY, -- Frappe ID
    machine TEXT, -- The FT Machine ID (e.g. Sufu-FD860)
    model TEXT,
    service_date DATE,
    service_hmr NUMERIC,
    technician_name TEXT,
    service_type TEXT,
    frappe_modified TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ft_service_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access for authenticated users
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.ft_service_logs;
CREATE POLICY "Enable read access for authenticated users"
  ON public.ft_service_logs 
FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Allow insert for authenticated users
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.ft_service_logs;
CREATE POLICY "Enable insert for authenticated users"
  ON public.ft_service_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: Allow update for authenticated users
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.ft_service_logs;
CREATE POLICY "Enable update for authenticated users"
  ON public.ft_service_logs 
FOR UPDATE 
TO authenticated 
USING (true);

-- Policy: Allow delete for authenticated users
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.ft_service_logs;
CREATE POLICY "Enable delete for authenticated users"
  ON public.ft_service_logs 
FOR DELETE 
TO authenticated 
USING (true);
