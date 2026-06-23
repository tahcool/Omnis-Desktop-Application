CREATE TABLE IF NOT EXISTS public.omnis_sales_persons (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    whatsapp_number TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.omnis_sales_persons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'omnis_sales_persons' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.omnis_sales_persons FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'omnis_sales_persons' AND policyname = 'Enable all access for authenticated users'
    ) THEN
        CREATE POLICY "Enable all access for authenticated users" ON public.omnis_sales_persons FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Seed initial data
INSERT INTO public.omnis_sales_persons (name, email, whatsapp_number) VALUES
('Antony Dube', 'antony@industrial-exchange.group', '263772000000'),
('Louis Munyama', 'sales@machinery-exchange.com', '263772000000'),
('Humphrey Masunda', 'sales.humphrey@machinery-exchange.com', '263772000000'),
('Terence Gotora', 'equipment@machinery-exchange.com', '263772000000'),
('Robin Hunter', 'robin.hunter@machinery-exchange.com', '263772000000'),
('Brendan Reilly', 'brendan@industrial-exchange.group', '263772000000'),
('Mathew Ferreira', 'mathew@industrial-exchange.group', '263772000000'),
('Tashinga Muchenje', 'tashinga@sinopower.co.zw', '263772000000'),
('Admire Maringisanwa', 'trucks@sinopower.co.zw', '263772000000'),
('Brett Berry', 'brett@sinopower.co.zw', '263772000000'),
('Chetan Samji', 'chetan.samji@machinery-exchange.com', '263772000000'),
('Takunda', 'takunda@industrial-exchange.group', '263772000000')
ON CONFLICT (name) DO NOTHING;
