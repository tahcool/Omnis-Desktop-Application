const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';

const sql = `
-- Patients Table
CREATE TABLE IF NOT EXISTS public.omnis_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    ibu TEXT,
    division TEXT,
    age INTEGER,
    phone_number TEXT,
    address_location TEXT,
    nok_contact TEXT,
    nok_address TEXT,
    background TEXT,
    chronic_illnesses TEXT,
    allergies TEXT,
    family_history TEXT,
    blood_type TEXT,
    current_medications TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sick Notes Table
CREATE TABLE IF NOT EXISTS public.omnis_sick_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.omnis_patients(id) ON DELETE CASCADE,
    date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
    condition TEXT NOT NULL,
    days_off INTEGER DEFAULT 0,
    remarks TEXT,
    qr_code_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Configuration
ALTER TABLE public.omnis_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omnis_sick_notes ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow full access for now, assuming authenticated context)
DROP POLICY IF EXISTS "Enable full access for omnis_patients" ON public.omnis_patients;
CREATE POLICY "Enable full access for omnis_patients" ON public.omnis_patients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable full access for omnis_sick_notes" ON public.omnis_sick_notes;
CREATE POLICY "Enable full access for omnis_sick_notes" ON public.omnis_sick_notes FOR ALL USING (true) WITH CHECK (true);
`;

async function main() {
  console.log("Running Medicals Migration on Supabase...");
  const resp = await fetch('https://api.supabase.com/v1/projects/pfqaeewmlwfayxbgmuaq/database/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  
  const text = await resp.text();
  console.log("Response Status:", resp.status);
  console.log("Response Body:", text);
}

main();
