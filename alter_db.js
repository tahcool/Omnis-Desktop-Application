const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());

async function addCol() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: 'ALTER TABLE fmb_reports ADD COLUMN IF NOT EXISTS committed_lead_time integer;' })
  });
  console.log(await response.text());
}
addCol();
