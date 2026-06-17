const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';

async function main() {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/', {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY
    }
  });
  
  if (!resp.ok) {
    console.error("Failed to fetch OpenAPI spec:", await resp.text());
    return;
  }
  
  const spec = await resp.json();
  const defs = spec.definitions;
  
  const orderTables = Object.keys(defs).filter(name => name.toLowerCase().includes('order') || name.toLowerCase().includes('track'));
  
  for (const t of orderTables) {
    console.log(`Table: ${t}`);
    const props = defs[t].properties;
    if (props) {
      console.log(`  Columns: ${Object.keys(props).join(', ')}`);
    }
  }
}

main();
