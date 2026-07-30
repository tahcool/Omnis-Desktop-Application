require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function listUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log(`Total users in Auth: ${data.users.length}`);
  
  // Show the last 5 users added
  const recentUsers = data.users
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);
    
  console.log('\nMost recent users:');
  recentUsers.forEach(u => {
    console.log(`- ${u.email} (Confirmed: ${!!u.email_confirmed_at})`);
  });
}

listUsers();
