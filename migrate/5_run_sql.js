#!/usr/bin/env node
/**
 * Runs create_tables.sql via Supabase Management API (pg endpoint).
 * This bypasses the missing exec_sql RPC and talks directly to postgres.
 */
const axios  = require('axios');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');

// Project ref extracted from the Supabase URL
const PROJECT_REF  = 'pfqaeewmlwfayxbgmuaq';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const SQL_FILE     = path.join(__dirname, 'pending_tables.sql');

// Supabase Management API endpoint for running SQL
const MGMT_URL = `https://${PROJECT_REF}.supabase.co/rest/v1/sql`;

async function runViaPg(sql) {
  // Try the pg endpoint (Supabase Pro/Team plans expose this)
  const res = await axios.post(
    MGMT_URL,
    { query: sql },
    {
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation'
      },
      timeout: 60000
    }
  );
  return res.data;
}

async function runViaNode() {
  // Use pg (node-postgres) if available
  const { Client } = require('pg');

  // Supabase connection string format
  const client = new Client({
    connectionString: `postgresql://postgres:${SERVICE_KEY}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    console.log('✅ Connected to Postgres directly. Running SQL...');
    await client.query(sql);
    await client.end();
    console.log('✅ All tables created successfully.\n');
    console.log('📌 Now run: node migrate/3_import.js\n');
    return true;
  } catch (e) {
    try { await client.end(); } catch {}
    throw e;
  }
}

async function main() {
  console.log('\n🚀 Attempting to create tables in Supabase...\n');

  // Try direct Postgres connection first
  try {
    await runViaNode();
    return;
  } catch (pgErr) {
    console.log(`   Direct PG failed: ${pgErr.message}`);
  }

  // Try REST pg endpoint
  try {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    await runViaPg(sql);
    console.log('✅ Tables created via REST.\n');
    return;
  } catch (restErr) {
    console.log(`   REST pg failed: ${restErr.response?.data?.message || restErr.message}`);
  }

  // Final fallback: open the SQL file in notepad
  console.log('\n💡 Auto-creation not available. Please run manually:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql/new');
  console.log('   2. Paste the contents of:');
  console.log(`      ${SQL_FILE}`);
  console.log('   3. Click Run');
  console.log('   4. Then run: node migrate/3_import.js\n');

  // Open file in default editor
  require('child_process').exec(`notepad "${SQL_FILE}"`);
  console.log('📂 Opening create_tables.sql in Notepad...\n');
}

main().catch(e => console.error('❌', e.message));
