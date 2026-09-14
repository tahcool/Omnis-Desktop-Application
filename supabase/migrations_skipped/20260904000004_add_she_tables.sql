-- 1. Breathalyzer Logs
CREATE TABLE IF NOT EXISTS omnis_breathalyzer_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES omnis_patients(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Failed', 'Warning')),
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE omnis_breathalyzer_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for admins" ON omnis_breathalyzer_logs FOR ALL USING (is_admin());

-- 2. First Aiders Registry
CREATE TABLE IF NOT EXISTS omnis_first_aiders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    division VARCHAR(100) NOT NULL,
    completed_training BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE omnis_first_aiders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for admins" ON omnis_first_aiders FOR ALL USING (is_admin());

-- 3. Monthly SHE Stats (Manpower and Manhours)
CREATE TABLE IF NOT EXISTS omnis_she_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_month INT NOT NULL CHECK (report_month BETWEEN 1 AND 12),
    report_year INT NOT NULL CHECK (report_year > 2000),
    division VARCHAR(100) NOT NULL,
    manpower_level INT NOT NULL DEFAULT 0,
    manhours_worked INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(report_month, report_year, division)
);

ALTER TABLE omnis_she_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for admins" ON omnis_she_stats FOR ALL USING (is_admin());
