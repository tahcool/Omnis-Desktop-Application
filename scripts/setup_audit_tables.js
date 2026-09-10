const https = require('https');
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set. See scripts/.env.server'); })());
const PROJECT_REF = 'pfqaeewmlwfayxbgmuaq';

const sqlQueries = `
ALTER TABLE public.customer_enquiries 
ADD COLUMN IF NOT EXISTS is_hot_lead boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_by text,
ADD COLUMN IF NOT EXISTS deletion_reason text,
ADD COLUMN IF NOT EXISTS pdf_url text,
ADD COLUMN IF NOT EXISTS quote_name text;

CREATE TABLE IF NOT EXISTS public.omnis_audit_trail (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL,
    performed_by text,
    performed_by_name text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.omnis_audit_trail ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on omnis_audit_trail" ON public.omnis_audit_trail;
CREATE POLICY "Allow all on omnis_audit_trail" ON public.omnis_audit_trail FOR ALL USING (true) WITH CHECK (true);
`;

async function runSQL(sql) {
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
}

async function main() {
  console.log('Sending SQL migration to Supabase...');
  const res = await runSQL(sqlQueries);
  console.log('Response:', res.status, res.body);
}

main();
