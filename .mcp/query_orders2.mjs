import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data: cols, error: colErr } = await sb
    .from('information_schema.columns')
    .select('table_name, column_name')
    .eq('table_schema', 'public');

  if (colErr) {
    console.error("Column error:", colErr);
  } else {
    const tableCols = {};
    for (const c of cols) {
      if (c.table_name.toLowerCase().includes('order') || c.table_name.toLowerCase().includes('track')) {
        if (!tableCols[c.table_name]) tableCols[c.table_name] = [];
        tableCols[c.table_name].push(c.column_name);
      }
    }
    console.log("Matching tables and columns:", JSON.stringify(tableCols, null, 2));
  }
}

main();
