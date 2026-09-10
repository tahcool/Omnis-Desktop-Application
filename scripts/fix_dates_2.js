const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set. See scripts/.env.server'); })()));

async function fixDates() {
  const headers = { 'Authorization': 'token 07660480c74686c:b43fd8b40ca211b' };
  let offset = 0;
  let allFrappe = [];
  while (true) {
    console.log(`Fetching from ${offset}...`);
    const res = await fetch(`https://fleetrack.machinery-exchange.com/api/resource/FT%20Breakdown%20Log?fields=["name","end_date"]&limit_page_length=1000&limit_start=${offset}`, { headers });
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    allFrappe.push(...data.data);
    offset += 1000;
  }
  
  console.log(`Fetched ${allFrappe.length} total records from Frappe.`);
  
  let updates = 0;
  for (let r of allFrappe) {
    if (r.end_date) {
      const { error } = await supabase.from('ft_breakdown_logs').update({ breakdown_end_date: r.end_date }).eq('frappe_name', r.name);
      if (error) console.error(error);
      updates++;
      if (updates % 100 === 0) console.log(`Updated ${updates}...`);
    }
  }
  
  console.log(`Finished updating ${updates} records.`);
}

fixDates().catch(console.error);
