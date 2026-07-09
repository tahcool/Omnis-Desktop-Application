/**
 * Create email tables using Supabase Management API
 * The Supabase Management API allows running SQL directly.
 */
const https = require('https');

// We need the personal access token for the management API
// Alternatively, let's use the pg extension from Supabase REST (it's different from mgmt API)

// Try the Supabase Database REST endpoint format
const PROJECT_REF = 'pfqaeewmlwfayxbgmuaq';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const statements = [
  `CREATE TABLE IF NOT EXISTS omnis_email_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    system text NOT NULL DEFAULT 'fleetrack',
    smtp_host text NOT NULL DEFAULT 'smtp.office365.com',
    smtp_port integer NOT NULL DEFAULT 587,
    smtp_user text NOT NULL DEFAULT '',
    smtp_pass text NOT NULL DEFAULT '',
    from_name text NOT NULL DEFAULT 'Omnis',
    use_tls boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (system)
  )`,
  `CREATE TABLE IF NOT EXISTS omnis_email_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    system text NOT NULL DEFAULT 'fleetrack',
    to_email text NOT NULL,
    to_name text,
    cc_email text,
    subject text NOT NULL,
    body_html text NOT NULL,
    body_text text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
    scheduled_for timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    error_message text,
    retry_count integer NOT NULL DEFAULT 0,
    related_doc text,
    related_type text,
    template_id text,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE omnis_email_config ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE omnis_email_queue ENABLE ROW LEVEL SECURITY`,
];

async function postSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=representation'
      }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Alternative: Use Supabase's table CREATE via direct API by using Postgres
// The proper way is through the management API or pg direct connection
// Let's check what's available
async function main() {
  // Try the Supabase v1 admin SQL endpoint
  const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('omnis_email_config','omnis_email_queue')`;
  
  const body = JSON.stringify({ query: sql });
  const result = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST', 
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  
  console.log('exec_sql test:', result.status, result.body.substring(0, 200));
  
  if (result.status === 404 || result.status === 400) {
    console.log('\n=== MANUAL SETUP REQUIRED ===');
    console.log('Please run the following SQL in the Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql/new');
    console.log('\n--- COPY FROM HERE ---');
    console.log(require('fs').readFileSync('scripts/create_email_tables.sql', 'utf8'));
    console.log('--- TO HERE ---');
  }
}

main().catch(console.error);
