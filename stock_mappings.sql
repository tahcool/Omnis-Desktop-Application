CREATE TABLE IF NOT EXISTS public.stock_company_mappings (
  brand text PRIMARY KEY,
  company text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.stock_company_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow full access to authenticated users" ON public.stock_company_mappings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for anon access if needed (optional)
CREATE POLICY "Allow read access to anon users" ON public.stock_company_mappings
  FOR SELECT
  TO anon
  USING (true);
