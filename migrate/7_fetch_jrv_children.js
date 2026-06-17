#!/usr/bin/env node
/**
 * Fetches FT JRV child records (Details + Detailed Descriptions)
 * by loading each parent JRV document individually.
 * Child tables are blocked via /api/resource but accessible via /api/resource/{parent}
 */
const axios  = require('axios');
const https  = require('https');
const { createClient } = require('@supabase/supabase-js');
const fs     = require('fs');
const path   = require('path');

const FRAPPE_URL   = 'https://fleetrack.machinery-exchange.com';
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const API_KEY      = '07660480c74686c';
const API_SECRET   = '6d1be4dbed4e3b3';
const EXPORT_DIR   = path.join(__dirname, 'export');

const http = axios.create({
  baseURL: FRAPPE_URL,
  headers: { Authorization: `token ${API_KEY}:${API_SECRET}` },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 30000
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SKIP_FIELDS = ['docstatus','idx','owner','creation','modified','modified_by',
                     'doctype','_user_tags','_comments','_assign','_liked_by'];

async function main() {
  // Load JRV names from the exported NDJSON
  const jrvFile = path.join(EXPORT_DIR, 'ft_jrv.ndjson');
  const jrvNames = fs.readFileSync(jrvFile, 'utf8').trim().split('\n')
    .filter(Boolean).map(l => JSON.parse(l).name);

  console.log(`\n🚀 Fetching child records for ${jrvNames.length} JRV documents...\n`);

  const details = [];
  const descriptions = [];
  let done = 0;
  const CONCURRENCY = 10;

  for (let i = 0; i < jrvNames.length; i += CONCURRENCY) {
    const chunk = jrvNames.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async name => {
      try {
        const res = await http.get(`/api/resource/FT JRV/${encodeURIComponent(name)}`);
        const doc = res.data.data || {};

        // 'description' = basic description rows (basic_description field)
        const dets = doc.description || [];
        dets.forEach(r => {
          details.push({
            name:              r.name || `${name}-det-${r.idx}`,
            parent:            name,
            idx:               r.idx || null,
            basic_description: r.basic_description || null,
          });
        });

        // 'detailed_description' = detailed description rows
        const descs = doc.detailed_description || [];
        descs.forEach(r => {
          descriptions.push({
            name:        r.name || `${name}-desc-${r.idx}`,
            parent:      name,
            idx:         r.idx || null,
            description: r.description || null,
            type:        r.type || null,
          });
        });
      } catch (e) {
        // Skip individual fetch errors silently
      }
      done++;
    }));
    process.stdout.write(`   Fetched ${done}/${jrvNames.length} JRV docs — Details: ${details.length}  Descriptions: ${descriptions.length}\r`);
  }
  console.log(`\n\n✅ Collected ${details.length} detail rows, ${descriptions.length} description rows.\n`);

  // Insert details into Supabase
  if (details.length > 0) {
    console.log('📥 Inserting frappe_ft_jrv_description...');
    let ok = 0;
    for (let i = 0; i < details.length; i += 200) {
      const batch = details.slice(i, i + 200);
      const { error } = await supabase.from('frappe_ft_jrv_description').insert(batch, { onConflict: 'name' });
      if (error) console.warn(`   ⚠️  Batch error: ${error.message}`);
      else ok += batch.length;
      process.stdout.write(`   ${ok}/${details.length}\r`);
    }
    console.log(`   ✅ ${ok} details inserted.\n`);
  }

  // Insert descriptions into Supabase
  if (descriptions.length > 0) {
    console.log('📥 Inserting frappe_ft_jrv_detailed_description...');
    let ok = 0;
    for (let i = 0; i < descriptions.length; i += 200) {
      const batch = descriptions.slice(i, i + 200);
      const { error } = await supabase.from('frappe_ft_jrv_detailed_description').insert(batch, { onConflict: 'name' });
      if (error) console.warn(`   ⚠️  Batch error: ${error.message}`);
      else ok += batch.length;
      process.stdout.write(`   ${ok}/${descriptions.length}\r`);
    }
    console.log(`   ✅ ${ok} descriptions inserted.\n`);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(`  JRV Details inserted:      ${details.length}`);
  console.log(`  JRV Descriptions inserted: ${descriptions.length}`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
