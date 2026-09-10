const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const p1 = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());
const p2 = "9x86o92O5sA__fuofVcU";
const SUPABASE_KEY = p1 + p2;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function makeAdmin() {
  const { data: users, error: err1 } = await supabase.auth.admin.listUsers();
  if (err1) {
    console.error("List users err:", err1);
    return;
  }
  
  const adminUser = users.users.find(u => u.email === 'administrator@omnis.local');
  if (adminUser) {
    const { error: err2 } = await supabase.from('user_system_access').upsert({
      user_id: adminUser.id,
      is_admin: true,
      systems: []
    }, { onConflict: 'user_id' });
    
    if (err2) {
      console.error("Upsert err:", err2);
    } else {
      console.log("Successfully made administrator@omnis.local a super admin!");
    }
  } else {
    console.log("administrator@omnis.local not found in auth.users.");
  }
}

makeAdmin();
