const { createClient } = require('@supabase/supabase-js');
const url = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const key = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(url, key);

async function check() {
  let res1 = await supabase.from('cdv_logs').select('*').limit(3);
  console.log('cdv_logs:', JSON.stringify(res1, null, 2));
  let res2 = await supabase.from('cdv_schedules').select('*').limit(3);
  console.log('cdv_schedules:', JSON.stringify(res2, null, 2));
}
check();
