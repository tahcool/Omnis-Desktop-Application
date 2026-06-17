// ═══════════════════════════════════════════════════════
//  import_technicians.js
//  Reads unique technician names from ft_service_log,
//  checks ft_technician for existing records,
//  and inserts any that are missing.
// ═══════════════════════════════════════════════════════
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase    = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

async function fetchAll(table, columns) {
  const BATCH = 1000;
  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + BATCH - 1);
    if (error) throw new Error(`[${table}] ${error.message}`);
    all = all.concat(data || []);
    if ((data || []).length < BATCH) break;
    from += BATCH;
  }
  return all;
}

async function main() {
  console.log('📋 Fetching all service log records from ft_service_log…');
  const logs = await fetchAll('ft_service_log', 'technician');

  // Extract unique, non-empty technician names
  const uniqueNames = [...new Set(
    logs.map(r => (r.technician || '').trim()).filter(Boolean)
  )].sort();

  console.log(`✅ Found ${uniqueNames.length} unique technician names in service log.`);
  uniqueNames.forEach((n, i) => console.log(`   ${i + 1}. ${n}`));

  // Fetch existing technicians
  console.log('\n📋 Fetching existing technicians from ft_technician…');
  const existing = await fetchAll('ft_technician', 'technician_name');
  const existingSet = new Set(existing.map(r => (r.technician_name || '').trim().toLowerCase()));
  console.log(`✅ ${existingSet.size} technicians already in ft_technician.`);

  // Determine which to insert
  const toInsert = uniqueNames.filter(n => !existingSet.has(n.toLowerCase()));
  console.log(`\n➕ ${toInsert.length} new technicians to import.`);

  if (toInsert.length === 0) {
    console.log('🎉 Nothing to do — all technicians already exist!');
    return;
  }

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_SIZE).map(rawName => {
      // Many entries have format "Firstname Lastname-PhoneNumber"
      // Split on last hyphen if followed by digits/+ to extract phone
      const phoneMatch = rawName.match(/^(.+?)[-–]\s*(\+?[\d\s]{7,})$/);
      const cleanName  = phoneMatch ? phoneMatch[1].trim() : rawName.trim();
      const phone      = phoneMatch ? phoneMatch[2].trim() : null;
      // Generate name PK: slug the raw full entry
      const slug = rawName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);
      return {
        name:            slug,
        technician_name: cleanName,
        mobile:          phone,
        designation:     null,
        site:            null
      };
    });

    const { error } = await supabase
      .from('ft_technician')
      .insert(chunk);

    if (error) {
      console.error(`❌ Insert error (batch ${Math.floor(i/BATCH_SIZE)+1}):`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`   ✅ Inserted batch ${Math.floor(i/BATCH_SIZE)+1} (${chunk.length} records)`);
    }
  }

  console.log(`\n🎉 Done! ${inserted} technicians imported into ft_technician.`);
  console.log('   You can now update mobile/designation/site from the Technicians view in the app.');
}

main().catch(err => {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
