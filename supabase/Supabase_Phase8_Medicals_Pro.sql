-- Omnis Clinic / Medicals Module PRO Upgrade
-- Supabase Schema Migration (Phase 8)

-- 1. Consultations Table
CREATE TABLE IF NOT EXISTS public.omnis_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.omnis_patients(id) ON DELETE CASCADE,
    consultation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Vitals
    blood_pressure TEXT,
    heart_rate INTEGER,
    temperature DECIMAL(4,1),
    weight DECIMAL(5,1),
    blood_sugar DECIMAL(5,1),
    
    -- Clinical Notes
    symptoms TEXT,
    clinical_observations TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Inventory Table
CREATE TABLE IF NOT EXISTS public.omnis_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    category TEXT, -- e.g., 'Medicine', 'Consumable', 'Equipment'
    quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    supplier TEXT,
    min_stock_level INTEGER DEFAULT 10,
    last_restocked TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Dispensations Table (Links Consultations to Inventory Usage)
CREATE TABLE IF NOT EXISTS public.omnis_dispensations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES public.omnis_consultations(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES public.omnis_inventory(id) ON DELETE RESTRICT,
    quantity_dispensed INTEGER NOT NULL,
    dispensation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS public.omnis_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.omnis_patients(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'Scheduled', -- 'Scheduled', 'Completed', 'Cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Configuration
ALTER TABLE public.omnis_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnis_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnis_dispensations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnis_appointments ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow full access for authenticated sessions/electrons)
DROP POLICY IF EXISTS "Enable full access for omnis_consultations" ON public.omnis_consultations;
CREATE POLICY "Enable full access for omnis_consultations" ON public.omnis_consultations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable full access for omnis_inventory" ON public.omnis_inventory;
CREATE POLICY "Enable full access for omnis_inventory" ON public.omnis_inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable full access for omnis_dispensations" ON public.omnis_dispensations;
CREATE POLICY "Enable full access for omnis_dispensations" ON public.omnis_dispensations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable full access for omnis_appointments" ON public.omnis_appointments;
CREATE POLICY "Enable full access for omnis_appointments" ON public.omnis_appointments FOR ALL USING (true) WITH CHECK (true);

-- End of File
