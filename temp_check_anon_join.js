const { createClient } = require('@supabase/supabase-js');
const sp = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcWFlZXdtbHdmYXl4YmdtdWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI2ODMwMTUsImV4cCI6MjAyODI1OTAxNX0.zY723l84xN_jE-w9Y9y03hS_Yx18H8mB6u4z6e_0rL4');

async function run() {
  const { data, error } = await sp.from('stock_inventory').select('*, stock_potential_customers(customer_name)');
  if (error) {
    console.error("ANON ERROR:", error);
  } else {
    console.log("ANON DATA LENGTH:", data.length);
  }
}
run();
