require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function alterTable() {
  const sql = `
    ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS account_manager TEXT,
    ADD COLUMN IF NOT EXISTS last_visit_date DATE;
  `;
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.log("Failed via RPC, trying direct insert if RPC doesn't exist...", error);
    // There is a temp_check_query.js that we can use to just run sql from node if there's no exec_sql.
    // Let's just create a migration file in supabase/migrations and also use python/node if possible.
  } else {
    console.log("Columns added successfully");
  }
}
alterTable();
