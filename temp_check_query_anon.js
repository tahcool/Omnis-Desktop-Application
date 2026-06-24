const { createClient } = require('@supabase/supabase-js');
const sp = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcWFlZXdtbHdmYXl4YmdtdWFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NTg3OTEsImV4cCI6MjA2MzEzNDc5MX0.YLx-ym_yS6K2lHJJXPx6OBpEdWnqmkBWrdlFd6I7mGU');

async function run() {
  console.log("Fetching stock with potential customers as ANON...");
  const { data, error } = await sp.from('stock_inventory').select('*, stock_potential_customers(customer_name)');
  if (error) {
    console.error("ERROR FETCHING:", error);
  } else {
    console.log("SUCCESS. Total records:", data.length);
    const hitachi = data.filter(d => d.brand === 'Hitachi');
    console.log("Hitachi records:", hitachi);
  }
}
run();
