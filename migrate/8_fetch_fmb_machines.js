#!/usr/bin/env node
const axios  = require('axios');
const https  = require('https');
const { createClient } = require('@supabase/supabase-js');
const fs     = require('fs');
const path   = require('path');

const FRAPPE_URL   = 'https://salestrack.powerstar.co.zw';
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const API_KEY      = '73624aafe4cc8cc';
const API_SECRET   = '178a078253e65ab';
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

async function main() {
  const fmbFile = path.join(EXPORT_DIR, 'fmb_report.ndjson');
  const fmbNames = fs.readFileSync(fmbFile, 'utf8').trim().split('\n')
    .filter(Boolean).map(l => JSON.parse(l).name);

  console.log(`\n🚀 Fetching child records for ${fmbNames.length} FMB Report documents...\n`);

  const machines = [];
  let done = 0;
  const CONCURRENCY = 10;

  for (let i = 0; i < fmbNames.length; i += CONCURRENCY) {
    const chunk = fmbNames.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async name => {
      try {
        const res = await http.get(`/api/resource/FMB Report/${encodeURIComponent(name)}`);
        const doc = res.data.data || {};

        // Child table name inside FMB Report might be 'machine_details' or 'machines' or 'table_1'
        // Let's find the array properties
        const arrays = Object.keys(doc).filter(k => Array.isArray(doc[k]));
        for (const k of arrays) {
          doc[k].forEach(r => {
             if (r.doctype === 'FMB Report Machine') {
               const clean = { ...r, parent: name };
               delete clean.docstatus;
               delete clean.idx;
               delete clean.owner;
               delete clean.creation;
               delete clean.modified;
               delete clean.modified_by;
               delete clean.doctype;
               machines.push(clean);
             }
          });
        }
      } catch (e) {
        console.warn(`   ⚠️  Error fetching ${name}: ${e.message}`);
      }
      done++;
    }));
    process.stdout.write(`   Fetched ${done}/${fmbNames.length} FMB Report docs — Machines: ${machines.length}\r`);
  }
  console.log(`\n\n✅ Collected ${machines.length} machine rows.\n`);

  if (machines.length > 0) {
    const outFile = path.join(EXPORT_DIR, 'fmb_report_machine.ndjson');
    fs.writeFileSync(outFile, machines.map(m => JSON.stringify(m)).join('\n'));
    console.log(`✅ Saved to ${outFile}`);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
