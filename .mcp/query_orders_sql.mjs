const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';

async function main() {
  const sql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%order%';";
  const resp = await fetch('https://api.supabase.com/v1/projects/pfqaeewmlwfayxbgmuaq/database/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  console.log("Tables:");
  console.log(await resp.text());

  const sql2 = "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name ILIKE '%order%';";
  const resp2 = await fetch('https://api.supabase.com/v1/projects/pfqaeewmlwfayxbgmuaq/database/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql2 }),
  });
  console.log("Columns:");
  console.log(await resp2.text());
}

main();
