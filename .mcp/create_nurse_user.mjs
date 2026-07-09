import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data, error } = await sb.auth.admin.createUser({
    email: 'chipo@industrial-exchange.group',
    password: 'che55ychips',
    email_confirm: true
  });

  if (error) {
    console.error("Error creating user:", error.message);
  } else {
    console.log("User created successfully:", data.user.email, data.user.id);
  }
}

main();
