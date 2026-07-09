const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);
supabase.from('items').select('*').limit(1).then(r => console.log(r)).catch(e => console.log(e));
