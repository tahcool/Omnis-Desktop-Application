import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data: tables, error: tableErr } = await sb
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .ilike('table_name', '%order%');

  if (tableErr) {
    console.error("Table error:", tableErr);
    return;
  }
  
  console.log("Order tables:", tables.map(t => t.table_name));

  for (const t of tables) {
    const { data: cols, error: colErr } = await sb
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', t.table_name);
    
    if (!colErr) {
      console.log(`Columns for ${t.table_name}:`, cols.map(c => c.column_name).join(', '));
    }
  }
}

main();
