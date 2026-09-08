-- Migration to create omnis_quotations and omnis_quotation_items tables

CREATE TABLE IF NOT EXISTS public.omnis_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL, -- ID like SAL-QTN-26-4159
    customer_name VARCHAR(255),
    contact_person VARCHAR(255),
    transaction_date DATE,
    company VARCHAR(255),
    currency VARCHAR(50) DEFAULT 'USD',
    sales_person VARCHAR(255),
    bank_account VARCHAR(255),
    pfi_checked BOOLEAN DEFAULT false,
    delivery VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.omnis_quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES public.omnis_quotations(id) ON DELETE CASCADE,
    item_code VARCHAR(255) NOT NULL,
    qty NUMERIC(15, 4) DEFAULT 0,
    rate NUMERIC(15, 4) DEFAULT 0,
    amount NUMERIC(15, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS configuration
ALTER TABLE public.omnis_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnis_quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to omnis_quotations" ON public.omnis_quotations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to omnis_quotation_items" ON public.omnis_quotation_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
