const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = env.match(/SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_KEY=(.*)/)[1].trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
async function run() {
  const table = 'omnis_email_queue';
  const method = 'select';
  const params = {'columns':'id','order':{'column':'created_at','ascending':false},'range':{'from':0,'to':49},'options':{'count':'exact'}};
  let query = supabase.from(table);
  query = query.select(params.columns || '*', params.options || {});
  if (params.order) query = query.order(params.order.column, { ascending: params.order.ascending ?? true });
  if (params.range) query = query.range(params.range.from, params.range.to);
  const result = await query;
  console.log('Result length:', result.data ? result.data.length : null);
  console.log('Result count:', result.count);
  console.log('Result error:', result.error);
  require('electron').app.quit();
}
require('electron').app.whenReady().then(run);
