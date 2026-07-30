require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetAllPasswords() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  for (const user of data.users) {
    console.log(`Resetting password for ${user.email}...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'ChangeMe@2026'
    });
    if (updateError) {
      console.error(`  -> Failed: ${updateError.message}`);
    } else {
      console.log(`  -> Success!`);
    }
  }
  console.log('All passwords reset to ChangeMe@2026!');
}

resetAllPasswords();
