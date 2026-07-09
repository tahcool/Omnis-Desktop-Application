const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);
supabase.from('ft_defect').select('*').then(res => console.log(JSON.stringify(res.data, null, 2)));
