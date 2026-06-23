const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc');

async function testGen() {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `SAL-QTN-${year}-`;
    const { data } = await supabase.from('quotations')
        .select('name')
        .ilike('name', `${prefix}%`)
        .order('creation', { ascending: false })
        .limit(1);
    console.log("Highest by creation:", data);
    
    // Also order by name descending
    const { data: d2 } = await supabase.from('quotations')
        .select('name')
        .ilike('name', `${prefix}%`)
        .order('name', { ascending: false })
        .limit(1);
    console.log("Highest by name:", d2);
}
testGen();
