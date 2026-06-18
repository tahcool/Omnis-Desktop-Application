-- Create the ft_operator_certificates table in Supabase
-- This table stores generated certificates

CREATE TABLE public.ft_operator_certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operator_name VARCHAR NOT NULL,
    id_number VARCHAR,
    machine_type VARCHAR,
    training_duration VARCHAR DEFAULT '12 day',
    completion_date DATE,
    special_mention VARCHAR,
    cert_ref_number VARCHAR UNIQUE NOT NULL,
    linked_training_id UUID REFERENCES public.ft_operator_training(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Turn on Row Level Security
ALTER TABLE public.ft_operator_certificates ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Enable read access for all users" 
ON public.ft_operator_certificates FOR SELECT 
USING (true);

-- Allow insert access
CREATE POLICY "Enable insert for all users" 
ON public.ft_operator_certificates FOR INSERT 
WITH CHECK (true);

-- Allow update access
CREATE POLICY "Enable update for all users" 
ON public.ft_operator_certificates FOR UPDATE 
USING (true);
