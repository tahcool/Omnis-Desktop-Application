import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Step 1: Create table via direct API calls (Supabase REST doesn't support DDL directly)
// We'll use the pg REST endpoint via the management API approach or check existing tables

// Check if table exists first
console.log('Checking for existing company_contacts table...');
const { data: check, error: checkErr } = await sb.from('company_contacts').select('id').limit(1);

if (checkErr && checkErr.code === '42P01') {
  console.log('Table does not exist. Will use SQL migration approach...');
  // Can't run DDL via supabase-js client REST API directly
  // We'll write a migration file instead
  console.log('Writing migration SQL...');
} else if (checkErr) {
  console.error('Check error:', checkErr.message);
} else {
  console.log('Table EXISTS. Current rows:', check);
  
  // Upsert default contacts
  const { data: upserted, error: upsertErr } = await sb.from('company_contacts').upsert([
    { company: 'Sinopower', contact_person: 'Brett Berry', contact_phone: '+263775553862', contact_email: 'brett@sinopower.co.zw', title: 'Commercial Manager' },
    { company: 'MXG', contact_person: 'Chetan Samji', contact_phone: '+263772949515', contact_email: 'chetan@machinery-exchange.com', title: 'Commercial Manager' },
    { company: 'MXG_LOGISTICS', contact_person: 'Humphrey', contact_phone: '+263777997136', contact_email: '', title: 'Logistics Manager' },
  ], { onConflict: 'company', ignoreDuplicates: true });
  
  if (upsertErr) console.error('Upsert error:', upsertErr);
  else console.log('Contacts seeded OK:', upserted);
}
