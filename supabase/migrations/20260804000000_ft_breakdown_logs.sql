-- Migration for FT Breakdown Logs (from Frappe)

CREATE TABLE IF NOT EXISTS public.ft_breakdown_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    frappe_name text UNIQUE, -- to store the original Frappe name for migration
    
    machine text,
    model text,
    customer text,
    customer_ref text,
    region text,
    serial_number text,
    fleet_no text,
    current_hmr text,
    warranty_status text,
    
    description text,
    breakdown_date date,
    breakdown_end_date date,
    
    urgent boolean DEFAULT false,
    on_hold boolean DEFAULT false,
    is_the_machine_still_running text,
    
    responsibility text,
    category text,
    status text,
    
    parts_eta text,
    quote_date text,
    ted_status text,
    ted text,
    red text,
    out_eta text,
    
    manager_comments text,
    supervisor_approved boolean DEFAULT false,
    sent_to_customer boolean DEFAULT false,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ft_breakdown_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users" 
ON public.ft_breakdown_logs FOR SELECT 
TO authenticated 
USING (true);

-- Allow insert access for authenticated users
CREATE POLICY "Allow insert for authenticated users" 
ON public.ft_breakdown_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow update access for authenticated users
CREATE POLICY "Allow update for authenticated users" 
ON public.ft_breakdown_logs FOR UPDATE 
TO authenticated 
USING (true);

-- Allow delete access for admins (assuming is_admin() function exists)
CREATE POLICY "Allow delete for admins" 
ON public.ft_breakdown_logs FOR DELETE 
TO authenticated 
USING (is_admin());
