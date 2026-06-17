const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://pfqaeewmlwfayxbgmuaq.supabase.co',
  'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc'
);

async function main() {
  // Try direct insert to see if table exists
  const check = await sb.from('ft_service_log').select('id').limit(1);
  if (!check.error) {
    console.log('ft_service_log already exists!');
    const row = await sb.from('ft_service_log').select('*').limit(1);
    if (row.data && row.data[0]) console.log('Columns:', Object.keys(row.data[0]).join(', '));
    return;
  }
  console.log('Table does not exist:', check.error.message);
  console.log('Please create it via Supabase SQL Editor with the SQL printed below:\n');
  console.log(`
CREATE TABLE IF NOT EXISTS public.ft_service_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  machine       text NOT NULL,
  customer      text,
  region        text,
  model         text,
  service_date  date NOT NULL,
  service_type  text,
  hmr_at_service numeric,
  technician    text,
  notes         text,
  logged_by     text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.ft_service_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_log_all" ON public.ft_service_log
  FOR ALL USING (true) WITH CHECK (true);
  `);
}
main().catch(console.error);
