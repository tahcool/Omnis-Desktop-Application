-- Create the stock_company_mappings table
CREATE TABLE IF NOT EXISTS public.stock_company_mappings (
    brand TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.stock_company_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies (allow read and write for authenticated users)
CREATE POLICY "Allow authenticated users to select stock_company_mappings"
    ON public.stock_company_mappings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert stock_company_mappings"
    ON public.stock_company_mappings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update stock_company_mappings"
    ON public.stock_company_mappings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete stock_company_mappings"
    ON public.stock_company_mappings
    FOR DELETE
    TO authenticated
    USING (true);

-- Insert some default mappings if empty
INSERT INTO public.stock_company_mappings (brand, company)
VALUES 
    ('Hitachi', 'Machinery Exchange'),
    ('Bobcat', 'Machinery Exchange'),
    ('Shantui', 'Machinery Exchange'),
    ('Shacman', 'Sinopower'),
    ('XCMG', 'Sinopower')
ON CONFLICT (brand) DO NOTHING;
