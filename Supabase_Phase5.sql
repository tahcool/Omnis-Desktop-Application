-- ==============================================================================
-- PHASE 5: DEFECT MANAGEMENT MODULE MIGRATION
-- ==============================================================================

-- 1. Create ft_defect table
CREATE TABLE IF NOT EXISTS public.ft_defect (
    name text PRIMARY KEY,
    defect_type text,
    machine text REFERENCES public.ft_machine(name) ON DELETE SET NULL,
    customer text,
    fleetrack_managed text,
    oem text,
    model text,
    location text,
    region text,
    warranty_status text,
    start_date date,
    priority text,
    status text,
    description text,
    on_hold boolean DEFAULT false,
    ted date,
    end_date date,
    defect_days integer,
    created_at timestamp with time zone DEFAULT now(),
    modified_at timestamp with time zone DEFAULT now()
);

-- 2. Sequence for Defect IDs
CREATE SEQUENCE IF NOT EXISTS ft_defect_id_seq START 10000;

-- 3. Trigger Function: Auto-Generate ID & Populate Machine Data
CREATE OR REPLACE FUNCTION ft_defect_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    m_record RECORD;
BEGIN
    -- Auto-generate ID if not provided
    IF NEW.name IS NULL OR NEW.name = '' THEN
        NEW.name := 'DEF-' || nextval('ft_defect_id_seq');
    END IF;

    -- Auto-fill machine data if machine is provided
    IF NEW.machine IS NOT NULL THEN
        SELECT customer, oem, model, location, region, warranty_status 
        INTO m_record 
        FROM public.ft_machine 
        WHERE name = NEW.machine;

        IF FOUND THEN
            -- Only overwrite if not explicitly provided by the client
            IF NEW.customer IS NULL THEN NEW.customer := m_record.customer; END IF;
            IF NEW.oem IS NULL THEN NEW.oem := m_record.oem; END IF;
            IF NEW.model IS NULL THEN NEW.model := m_record.model; END IF;
            IF NEW.location IS NULL THEN NEW.location := m_record.location; END IF;
            IF NEW.region IS NULL THEN NEW.region := m_record.region; END IF;
            IF NEW.warranty_status IS NULL THEN NEW.warranty_status := m_record.warranty_status; END IF;
        END IF;
    END IF;

    -- Default start_date if missing
    IF NEW.start_date IS NULL THEN
        NEW.start_date := CURRENT_DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger
DROP TRIGGER IF EXISTS trg_ft_defect_before_insert ON public.ft_defect;
CREATE TRIGGER trg_ft_defect_before_insert
    BEFORE INSERT ON public.ft_defect
    FOR EACH ROW
    EXECUTE FUNCTION ft_defect_before_insert();

-- 5. RLS Policies
ALTER TABLE public.ft_defect ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.ft_defect;
CREATE POLICY "Enable read access for all users" ON public.ft_defect
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.ft_defect;
CREATE POLICY "Enable insert access for all users" ON public.ft_defect
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.ft_defect;
CREATE POLICY "Enable update access for all users" ON public.ft_defect
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.ft_defect;
CREATE POLICY "Enable delete access for all users" ON public.ft_defect
    FOR DELETE USING (true);
