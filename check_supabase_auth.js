const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function checkAuth() {
    const { data: users, error: authError } = await sb.auth.admin.listUsers();
    if (authError) {
        console.error('Auth error:', authError);
        return;
    }
    
    console.log('Users in Supabase:', users.users.map(u => ({ email: u.email, id: u.id })));
    
    const { data: access, error: accessError } = await sb.from('user_system_access').select('*');
    if (accessError) {
        console.error('user_system_access error:', accessError);
        return;
    }
    
    console.log('user_system_access rows:', access);
}

checkAuth().catch(console.error);
