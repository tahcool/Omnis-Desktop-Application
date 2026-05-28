const { createClient } = require('./omnis-mobile/node_modules/@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');

async function check() {
    console.log('Checking ft_breakdown_log...');
    let res = await supabase.from('ft_breakdown_log').select('*').limit(1);
    console.log('ft_breakdown_log:', res.error ? res.error : res.data);

    console.log('Checking ft_machine...');
    res = await supabase.from('ft_machine').select('*').limit(1);
    console.log('ft_machine:', res.error ? res.error : res.data);

    console.log('Checking Quotation...');
    res = await supabase.from('Quotation').select('*').limit(1);
    console.log('quotation:', res.error ? res.error : res.data);
    
    console.log('Checking quotation...');
    res = await supabase.from('quotation').select('*').limit(1);
    console.log('quotation:', res.error ? res.error : res.data);
}

check();
