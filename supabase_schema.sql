-- Supabase Schema for Omnis Order Tracking
-- This schema mirrors Frappe's FMB Report but is optimized for PostgreSQL

-- 1. FMB Reports (Parent)
CREATE TABLE IF NOT EXISTS fmb_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frappe_id TEXT UNIQUE NOT NULL,
    status TEXT,
    customer_id TEXT,
    order_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Order Machines (Child)
CREATE TABLE IF NOT EXISTS order_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES fmb_reports(id) ON DELETE CASCADE,
    frappe_row_id TEXT UNIQUE,
    item_code TEXT,
    serial_no TEXT,
    quantity INTEGER DEFAULT 1,
    target_date DATE,
    revised_date DATE,
    notes TEXT,
    image_1_url TEXT,
    image_2_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Order Contacts (Child)
CREATE TABLE IF NOT EXISTS order_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES fmb_reports(id) ON DELETE CASCADE,
    salutation TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE fmb_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_contacts ENABLE ROW LEVEL SECURITY;

-- Default Policies (Allow all for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON fmb_reports FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON order_machines FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON order_contacts FOR ALL TO authenticated USING (true);

-- Functions for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fmb_reports_modtime BEFORE UPDATE ON fmb_reports FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_order_machines_modtime BEFORE UPDATE ON order_machines FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_order_contacts_modtime BEFORE UPDATE ON order_contacts FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
-- Stock Inventory Table
CREATE TABLE IF NOT EXISTS stock_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frappe_id TEXT UNIQUE NOT NULL,
    company TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    proposed_qty INTEGER DEFAULT 0,
    actual_qty INTEGER DEFAULT 0,
    prod_date DATE,
    ship_date DATE,
    eta_durban DATE,
    eta_beira DATE,
    eta_harare DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stock Potential Customers (Child Table)
CREATE TABLE IF NOT EXISTS stock_potential_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID REFERENCES stock_inventory(id) ON DELETE CASCADE,
    customer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frappe_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Item Groups Table
CREATE TABLE IF NOT EXISTS item_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frappe_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    parent_group TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products Table (Relational)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frappe_id TEXT UNIQUE NOT NULL,
    item_code TEXT,
    item_name TEXT,
    item_group_id UUID REFERENCES item_groups(id) ON DELETE SET NULL,
    item_group_name TEXT, -- For high-speed autofill
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    brand_name TEXT, -- For high-speed autofill
    uom TEXT,
    rate NUMERIC DEFAULT 0,
    image_url TEXT,
    spec_sheet_url TEXT,
    options_offered TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frappe_id TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_group TEXT,
    territory TEXT,
    customer_type TEXT,
    default_price_list TEXT,
    tier INTEGER DEFAULT 0, -- 1-5 stars for visit frequency
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Search Index for Customers
CREATE INDEX IF NOT EXISTS customers_search_idx ON customers USING GIN (to_tsvector('english', customer_name || ' ' || frappe_id));

-- 6. Aftersales Handover Table
CREATE TABLE IF NOT EXISTS aftersales_handover (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT,                          -- Reference to FMB order name
    company TEXT,
    contact_person TEXT,
    cell_number TEXT,
    email_address TEXT,
    additional_email TEXT,
    physical_address TEXT,
    date_of_sale DATE,
    equipment_model TEXT,
    chassis_number TEXT,
    engine_number TEXT,
    oem TEXT,                               -- Shantui, Hitachi, Wirtgen, Bobcat, Cummins, Rokbak
    location TEXT,
    warranty_start_date DATE,
    warranty_applicable TEXT,
    warranty_end_date DATE,
    service_plan TEXT,
    training_done TEXT DEFAULT 'No',
    training_date DATE,
    training_operator TEXT,
    handover_salesperson TEXT,
    handover_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'Pending',          -- Pending | Completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS for Aftersales
ALTER TABLE aftersales_handover ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON aftersales_handover FOR ALL TO authenticated USING (true);
CREATE TRIGGER update_aftersales_modtime BEFORE UPDATE ON aftersales_handover FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS aftersales_status_idx ON aftersales_handover (status);
CREATE INDEX IF NOT EXISTS aftersales_order_idx ON aftersales_handover (order_id);

-- 7. Product Pricing Table
CREATE TABLE IF NOT EXISTS product_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frappe_id TEXT UNIQUE NOT NULL,
    customer TEXT,
    item TEXT,
    currency_pricing TEXT,
    
    -- CREATE NEW PRICE
    oem_price NUMERIC,
    foreign_portion_cost NUMERIC,
    freight_cost NUMERIC,
    duty_cost NUMERIC,
    clearance_cost NUMERIC,
    offload_cost NUMERIC,
    offload_pdi_cost NUMERIC,
    saferider_cost NUMERIC,
    bucket_conversion_cost NUMERIC,
    fitting_blade_cost NUMERIC,
    first_service_cost NUMERIC,
    parts_warranty_cost NUMERIC,
    warranty_allowable_cost NUMERIC,
    markup_percentage NUMERIC,
    
    -- MOST RECENT ITEM PRICE
    oem_price_last NUMERIC,
    foreign_portion_cost_last NUMERIC,
    freight_cost_last NUMERIC,
    duty_cost_last NUMERIC,
    clearance_cost_last NUMERIC,
    offload_cost_last NUMERIC,
    offload_pdi_cost_last NUMERIC,
    saferider_cost_last NUMERIC,
    bucket_conversion_cost_last NUMERIC,
    fitting_blade_cost_last NUMERIC,
    first_service_cost_last NUMERIC,
    parts_warranty_cost_last NUMERIC,
    warranty_allowable_cost_last NUMERIC,
    markup_percentage_last NUMERIC,
    computed_markup NUMERIC,
    
    -- HISTORICAL AVERAGE PRICING
    oem_price_avg NUMERIC,
    foreign_portion_cost_avg NUMERIC,
    freight_cost_avg NUMERIC,
    duty_cost_avg NUMERIC,
    clearance_cost_avg NUMERIC,
    offload_cost_avg NUMERIC,
    offload_pdi_cost_avg NUMERIC,
    saferider_cost_avg NUMERIC,
    bucket_conversion_cost_avg NUMERIC,
    fitting_blade_cost_avg NUMERIC,
    first_service_cost_avg NUMERIC,
    parts_warranty_cost_avg NUMERIC,
    warranty_allowable_cost_avg NUMERIC,
    markup_percentage_avg NUMERIC,
    
    -- SUMMARIES
    rounded_up_price NUMERIC,
    margin_percentage NUMERIC,
    landed_cost NUMERIC,
    retail_price NUMERIC,
    
    rounded_up_price_last NUMERIC,
    margin_percentage_last NUMERIC,
    landed_cost_last NUMERIC,
    retail_price_last NUMERIC,
    
    rounded_up_price_avg NUMERIC,
    margin_percentage_avg NUMERIC,
    landed_cost_avg NUMERIC,
    retail_price_avg NUMERIC,
    
    pricing_history_html TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS for Product Pricing
ALTER TABLE product_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON product_pricing FOR ALL TO authenticated USING (true);
CREATE TRIGGER update_product_pricing_modtime BEFORE UPDATE ON product_pricing FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS product_pricing_item_idx ON product_pricing (item);
CREATE INDEX IF NOT EXISTS product_pricing_customer_idx ON product_pricing (customer);


-- 8. Customer Credit Profiles
CREATE TABLE IF NOT EXISTS customer_credit_profiles (
    customer_id TEXT PRIMARY KEY, -- Maps to frappe_id
    credit_score INTEGER DEFAULT 800,
    credit_status TEXT DEFAULT 'Good', -- Good, Warning, Blocked
    total_outstanding NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Payment Deals
CREATE TABLE IF NOT EXISTS payment_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_reference TEXT UNIQUE NOT NULL, -- e.g. PD-2026-001
    customer_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    principal_amount NUMERIC NOT NULL,
    interest_rate NUMERIC NOT NULL,
    interest_amount NUMERIC NOT NULL,
    total_payable NUMERIC NOT NULL,
    start_date DATE NOT NULL,
    status TEXT DEFAULT 'Active', -- Active, Completed, Defaulted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Payment Installments
CREATE TABLE IF NOT EXISTS payment_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES payment_deals(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due NUMERIC NOT NULL,
    status TEXT DEFAULT 'Pending', -- Pending, Paid, Overdue
    paid_date DATE,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS
ALTER TABLE customer_credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON customer_credit_profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON payment_deals FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON payment_installments FOR ALL TO authenticated USING (true);

-- Triggers
CREATE TRIGGER update_customer_credit_profiles_modtime BEFORE UPDATE ON customer_credit_profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_payment_deals_modtime BEFORE UPDATE ON payment_deals FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_payment_installments_modtime BEFORE UPDATE ON payment_installments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_deals_customer ON payment_deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_deal ON payment_installments(deal_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status ON payment_installments(status);



-- Payment Terms Enhancement Pipeline Updates
ALTER TABLE fmb_reports ADD COLUMN IF NOT EXISTS is_payment_terms BOOLEAN DEFAULT false;
ALTER TABLE payment_deals ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES fmb_reports(id);
