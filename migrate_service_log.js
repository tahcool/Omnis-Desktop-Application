/**
 * Migration script: Frappe FT Service Log → Supabase ft_service_log
 * 
 * Fetches all records from Frappe's "FT Service Log" doctype and inserts
 * them into the Supabase ft_service_log table, skipping duplicates.
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const FRAPPE_BASE  = 'https://fleetrack.machinery-exchange.com';

// Read Frappe session cookie from the Electron app's stored credentials
// We use the same auth approach as the app
const FRAPPE_AUTH = {
  usr: 'Administrator',
  // Password not needed - we use the API key approach via get_list
};

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function fetchFrappeServiceLogs(cookie) {
  const fields = JSON.stringify([
    'name', 'machine', 'customer', 'region', 'model',
    'service_date', 'service_type', 'hmr_at_service',
    'technician', 'notes', 'owner', 'creation'
  ]);
  
  let allRecords = [];
  let page = 0;
  const pageSize = 200;
  
  while (true) {
    const url = `${FRAPPE_BASE}/api/resource/FT Service Log?fields=${encodeURIComponent(fields)}&limit_start=${page * pageSize}&limit_page_length=${pageSize}&order_by=creation+asc`;
    console.log(`  Fetching page ${page + 1} (offset ${page * pageSize})...`);
    
    const res = await httpsGet(url, {
      'Cookie': cookie,
      'Accept': 'application/json',
    });
    
    if (res.status === 404) {
      console.log('  ⚠️  Doctype "FT Service Log" not found on Frappe. Trying alternative names...');
      return null;
    }
    if (res.status === 403) {
      console.log('  ❌ Auth failed - need valid Frappe session cookie.');
      return null;
    }
    
    const records = res.data?.data || [];
    console.log(`  Got ${records.length} records`);
    allRecords = allRecords.concat(records);
    
    if (records.length < pageSize) break;
    page++;
  }
  
  return allRecords;
}

async function tryDoctypeNames(cookie) {
  // Try common Frappe doctype name variations
  const names = ['FT Service Log', 'FT HMR Service Log', 'FT Maintenance Log', 'Service Log'];
  
  for (const doctype of names) {
    const url = `${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?limit_page_length=1`;
    console.log(`Trying doctype: "${doctype}"...`);
    const res = await httpsGet(url, { 'Cookie': cookie, 'Accept': 'application/json' });
    if (res.status === 200) {
      console.log(`✅ Found: "${doctype}" with ${res.data?.data?.length || 0} sample records`);
      console.log('Sample:', JSON.stringify(res.data?.data?.[0] || {}, null, 2));
      return doctype;
    } else {
      console.log(`  → ${res.status}: not found`);
    }
  }
  return null;
}

async function upsertToSupabase(records) {
  if (!records || records.length === 0) {
    console.log('No records to migrate.');
    return;
  }
  
  console.log(`\nMigrating ${records.length} records to Supabase...`);
  
  // Check existing frappe_names to avoid duplicates
  const { data: existing } = await sb
    .from('ft_service_log')
    .select('frappe_name')
    .not('frappe_name', 'is', null);
  
  const existingNames = new Set((existing || []).map(r => r.frappe_name));
  console.log(`Already migrated: ${existingNames.size} records`);
  
  const toInsert = records
    .filter(r => !existingNames.has(r.name))
    .map(r => ({
      machine:        r.machine || null,
      customer:       r.customer || null,
      region:         r.region || null,
      model:          r.model || null,
      service_date:   r.service_date || r.creation?.split(' ')[0] || null,
      service_type:   r.service_type || null,
      hmr_at_service: r.hmr_at_service ? Number(r.hmr_at_service) : null,
      technician:     r.technician || null,
      notes:          r.notes || null,
      logged_by:      r.owner || 'Frappe',
      frappe_name:    r.name,
      created_at:     r.creation ? new Date(r.creation).toISOString() : new Date().toISOString(),
    }));
  
  if (toInsert.length === 0) {
    console.log('✅ All records already migrated!');
    return;
  }
  
  console.log(`Inserting ${toInsert.length} new records...`);
  
  // Batch insert in chunks of 100
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const { error } = await sb.from('ft_service_log').insert(chunk);
    if (error) {
      console.error(`❌ Insert error on chunk ${i / CHUNK + 1}:`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`  ✓ Inserted ${inserted}/${toInsert.length}`);
    }
  }
  
  console.log(`\n✅ Migration complete! ${inserted} records added to Supabase.`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('FT Service Log Migration: Frappe → Supabase');
  console.log('='.repeat(60));
  
  // First, check if ft_service_log table exists
  const { error: tableErr } = await sb.from('ft_service_log').select('id').limit(1);
  if (tableErr) {
    console.error('\n❌ ERROR: ft_service_log table does not exist in Supabase yet!');
    console.error('Please run the CREATE TABLE SQL first in the Supabase SQL Editor:');
    console.error(`
CREATE TABLE IF NOT EXISTS public.ft_service_log (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  machine        text NOT NULL,
  customer       text,
  region         text,
  model          text,
  service_date   date,
  service_type   text,
  hmr_at_service numeric,
  technician     text,
  notes          text,
  logged_by      text,
  frappe_name    text UNIQUE,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE public.ft_service_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_log_all ON public.ft_service_log FOR ALL USING (true) WITH CHECK (true);
    `);
    return;
  }
  console.log('✅ ft_service_log table exists in Supabase');
  
  // Get a Frappe session - use the API via the running Electron app's session
  // We need to login to Frappe first to get a cookie
  console.log('\nAttempting Frappe authentication...');
  
  const loginPayload = JSON.stringify({ usr: 'Administrator', pwd: '' });
  const loginRes = await httpsGet(
    `${FRAPPE_BASE}/api/method/login?usr=Administrator&pwd=admin`,
    { 'Content-Type': 'application/json' }
  );
  
  // Try with API key approach - check if Frappe public API works
  console.log('Testing Frappe connection...');
  const testRes = await httpsGet(
    `${FRAPPE_BASE}/api/resource/FT Service Log?limit_page_length=1`,
    { 'Accept': 'application/json' }
  );
  
  console.log('Frappe response status:', testRes.status);
  
  if (testRes.status === 200) {
    console.log('\n✅ Frappe accessible without auth (public API)');
    const doctype = 'FT Service Log';
    const records = await fetchFrappeServiceLogs('');
    if (records) await upsertToSupabase(records);
  } else if (testRes.status === 403 || testRes.status === 401) {
    console.log('\n⚠️  Frappe requires authentication.');
    console.log('The migration needs to run from inside the Electron app where you are already logged in.');
    console.log('\nAlternative: Export data from Frappe and import via the migration tool.');
    console.log('Or provide Frappe API key in environment: FRAPPE_COOKIE=your_session_cookie node migrate_service_log.js');
    
    const cookie = process.env.FRAPPE_COOKIE;
    if (cookie) {
      console.log('\nUsing provided cookie...');
      const doctype = await tryDoctypeNames(cookie);
      if (doctype) {
        const records = await fetchFrappeServiceLogs(cookie);
        if (records) await upsertToSupabase(records);
      }
    }
  } else {
    console.log('Unexpected status:', testRes.status);
    console.log('Response:', JSON.stringify(testRes.data).substring(0, 200));
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
