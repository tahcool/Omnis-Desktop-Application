require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    console.log("Customer columns:", Object.keys(data[0]));
  } else {
    console.log("No data found, can't infer schema easily via select. Let's try RPC or another table.");
  }
}
run();
