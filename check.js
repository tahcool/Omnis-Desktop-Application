const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);
supabase.from('fmb_reports').select('status').limit(1).then(r => console.log(JSON.stringify(r)));
