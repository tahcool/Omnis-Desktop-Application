-- Table: ft_customer
CREATE TABLE public.ft_customer (
    name text PRIMARY KEY,
    customer_name text,
    contact_details_section text,
    management_email text,
    contact_person_1 text,
    mobile_1 text,
    column_break_7 text,
    technical_email text,
    contact_person_2 text,
    mobile_2 text,
    column_break_10 text,
    column_break_9 text,
    section_break_9 text,
    column_break_8 text,
    on_fleetrack text,
    column_break_nslvt text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ft_customer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_customer" ON public.ft_customer FOR ALL USING (true) WITH CHECK (true);

-- Table: ft_region
CREATE TABLE public.ft_region (
    name text PRIMARY KEY,
    region_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ft_region ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_region" ON public.ft_region FOR ALL USING (true) WITH CHECK (true);

-- Table: ft_location
CREATE TABLE public.ft_location (
    name text PRIMARY KEY,
    location text,
    column_break_2 text,
    country text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ft_location ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_location" ON public.ft_location FOR ALL USING (true) WITH CHECK (true);

-- Table: ft_machine_model
CREATE TABLE public.ft_machine_model (
    name text PRIMARY KEY,
    oem text,
    column_break_2 text,
    model_name text,
    si_hours numeric,
    fuel_consumption_section text,
    fuel_consumption numeric,
    column_break_lsb53 text,
    fuel_consumption_class text,
    column_break_mxvlx text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ft_machine_model ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_machine_model" ON public.ft_machine_model FOR ALL USING (true) WITH CHECK (true);

-- Table: ft_machine_oem
CREATE TABLE public.ft_machine_oem (
    name text PRIMARY KEY,
    oem text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ft_machine_oem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_machine_oem" ON public.ft_machine_oem FOR ALL USING (true) WITH CHECK (true);

-- Table: ft_machine_type
CREATE TABLE public.ft_machine_type (
    name text PRIMARY KEY,
    type_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ft_machine_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_machine_type" ON public.ft_machine_type FOR ALL USING (true) WITH CHECK (true);

-- Table: ft_technician
CREATE TABLE public.ft_technician (
    name text PRIMARY KEY,
    technician_name text,
    column_break_2 text,
    mobile text,
    column_break_fnvez text,
    site text,
    column_break_vuars text,
    designation text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ft_technician ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_technician" ON public.ft_technician FOR ALL USING (true) WITH CHECK (true);

-- Table: ft_bd_category
CREATE TABLE public.ft_bd_category (
    name text PRIMARY KEY,
    category text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ft_bd_category ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_bd_category" ON public.ft_bd_category FOR ALL USING (true) WITH CHECK (true);

-- Table: ft_defect_category
CREATE TABLE public.ft_defect_category (
    name text PRIMARY KEY,
    category text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ft_defect_category ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ft_defect_category" ON public.ft_defect_category FOR ALL USING (true) WITH CHECK (true);
