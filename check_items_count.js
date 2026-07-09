const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);
supabase.from('products').select('id', { count: 'exact', head: true }).then(r => console.log("Items count:", r.count)).catch(e => console.log(e));
