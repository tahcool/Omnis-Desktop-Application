const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');
supabase.from('ft_defect').select('*').then(res => console.log(JSON.stringify(res.data, null, 2)));
