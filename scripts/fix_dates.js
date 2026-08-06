const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', 'sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU');

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
  
  const map = {};
  for (let r of allFrappe) {
    if (r.end_date) map[r.name] = r.end_date;
  }
  
  console.log(`Found ${Object.keys(map).length} records with end_date.`);
  
  const { data: sbData } = await supabase.from('ft_breakdown_logs').select('id, frappe_name, breakdown_end_date');
  console.log(`Found ${sbData.length} records in Supabase.`);
  
  let updates = 0;
  for (let r of sbData) {
    const end = map[r.frappe_name];
    if (end && !r.breakdown_end_date) {
      await supabase.from('ft_breakdown_logs').update({ breakdown_end_date: end }).eq('id', r.id);
      updates++;
      if (updates % 100 === 0) console.log(`Updated ${updates}...`);
    }
  }
  
  console.log(`Finished updating ${updates} records.`);
}

fixDates().catch(console.error);
