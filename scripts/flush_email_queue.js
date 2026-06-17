const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';

async function main() {
  const resp = await fetch(SUPABASE_URL + '/functions/v1/process-email-queue', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  const text = await resp.text();
  console.log('Status:', resp.status);
  console.log('Response:', text);
}
main();
