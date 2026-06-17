/**
 * Creates the company_contacts table and seeds default data.
 * Run: node .mcp/setup_company_contacts.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Use the Supabase REST API to call exec_sql
async function execSql(sql) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  const text = await resp.text();
  console.log(`HTTP ${resp.status}:`, text.substring(0, 300));
  return { ok: resp.ok, status: resp.status, text };
}

// Step 1: Try exec_sql RPC
console.log('\n=== Step 1: Create company_contacts table via exec_sql ===');
const createSql = `
CREATE TABLE IF NOT EXISTS public.company_contacts (
  id          SERIAL PRIMARY KEY,
  company     TEXT    NOT NULL UNIQUE,
  contact_person TEXT NOT NULL DEFAULT '',
  contact_phone  TEXT NOT NULL DEFAULT '',
  contact_email  TEXT DEFAULT '',
  title          TEXT DEFAULT 'Commercial Manager',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT DEFAULT ''
);

-- Enable RLS
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_contacts' AND policyname = 'Allow read for authenticated'
  ) THEN
    CREATE POLICY "Allow read for authenticated" ON public.company_contacts FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Allow service_role to do everything (admin writes)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_contacts' AND policyname = 'Allow all for service_role'
  ) THEN
    CREATE POLICY "Allow all for service_role" ON public.company_contacts TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

const createResult = await execSql(createSql);

if (!createResult.ok) {
  console.log('exec_sql RPC not available. Trying direct insert approach...');
  
  // Fallback: The table doesn't exist yet. Let's use the Management API
  const mgmtResp = await fetch(`https://api.supabase.com/v1/projects/pfqaeewmlwfayxbgmuaq/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: createSql }),
  });
  console.log('Management API response:', mgmtResp.status, await mgmtResp.text().then(t => t.substring(0, 200)));
} else {
  console.log('Table created successfully!');
}

// Step 2: Seed default contacts
console.log('\n=== Step 2: Seeding default contacts ===');
const seedSql = `
INSERT INTO public.company_contacts (company, contact_person, contact_phone, contact_email, title)
VALUES 
  ('Sinopower', 'Brett Berry', '+263775553862', 'brett@sinopower.co.zw', 'Commercial Manager'),
  ('MXG', 'Chetan Samji', '+263772949515', 'chetan@machinery-exchange.com', 'Commercial Manager'),
  ('MXG_LOGISTICS', 'Humphrey', '+263777997136', '', 'Logistics Manager')
ON CONFLICT (company) DO NOTHING;
`;

const seedResult = await execSql(seedSql);

// Step 3: Verify
console.log('\n=== Step 3: Verifying data ===');
const { data, error } = await sb.from('company_contacts').select('*');
if (error) {
  console.error('Verify error:', error.message);
} else {
  console.log('Contacts in database:');
  data.forEach(r => console.log(`  [${r.company}] ${r.contact_person} | ${r.contact_phone} | ${r.contact_email}`));
}
