require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCustomers() {
  const { data, error } = await supabase.from('customers').select('customer_name, account_manager').limit(10);
  if (error) {
    console.error('Error fetching customers:', error);
    return;
  }
  
  console.log(`Sample customers:`);
  data.forEach(c => {
    console.log(`- ${c.customer_name}: ${c.account_manager}`);
  });

  const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true }).not('account_manager', 'is', null).neq('account_manager', '');
  console.log(`Total customers with an account manager assigned: ${count}`);
}

checkCustomers();
