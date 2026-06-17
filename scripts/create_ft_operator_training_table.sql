-- Create the ft_operator_training table in Supabase
-- This table tracks planned and completed operator trainings

CREATE TABLE public.ft_operator_training (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id VARCHAR NOT NULL,
    customer VARCHAR,
    machine VARCHAR,
    location VARCHAR,
    training_date DATE,
    trainer_name VARCHAR,
    number_of_operators INTEGER DEFAULT 1,
    status VARCHAR DEFAULT 'Planned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Turn on Row Level Security (optional, depending on your setup)
ALTER TABLE public.ft_operator_training ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Enable read access for all users" 
ON public.ft_operator_training FOR SELECT 
USING (true);

-- Allow insert access
CREATE POLICY "Enable insert for all users" 
ON public.ft_operator_training FOR INSERT 
WITH CHECK (true);

-- Allow update access
CREATE POLICY "Enable update for all users" 
ON public.ft_operator_training FOR UPDATE 
USING (true);
