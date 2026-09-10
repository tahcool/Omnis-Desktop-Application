const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set. See scripts/.env.server'); })()));

async function backfill() {
  console.log("Starting bulk backfill...");
  const { data: logs, error } = await supabase.from('ft_breakdown_log').select('name, end_date').not('end_date', 'is', null);
  if (error) return console.error(error);
  
  console.log(`Found ${logs.length} logs with end dates in raw table.`);
  
  // Need to fetch existing records from unified table to do bulk upsert correctly (preserving other fields)
  // Actually, Supabase upsert requires all NOT NULL fields or it defaults.
  // Better approach: Since we only need to update 1 column, we can do multiple updates in Promise.all() batches of 100
  
  const batchSize = 50;
  let updated = 0;
  for (let i = 0; i < logs.length; i += batchSize) {
    const batch = logs.slice(i, i + batchSize);
    const promises = batch.map(log => 
      supabase.from('ft_breakdown_logs').update({ breakdown_end_date: log.end_date }).eq('frappe_name', log.name)
    );
    await Promise.all(promises);
    updated += batch.length;
    console.log(`Updated ${updated}/${logs.length}`);
  }
  
  console.log(`Updated ${updated} records in unified table!`);
}

backfill();
