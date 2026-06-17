const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';

async function main() {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/', {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY
    }
  });
  
  const spec = await resp.json();
  console.log("All tables:", Object.keys(spec.definitions).join(', '));
}
main();
