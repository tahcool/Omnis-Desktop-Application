const {createClient} = require('@supabase/supabase-js');
const s = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set. See scripts/.env.server'); })()));

async function test() {
  let q = s.from('ft_breakdown_logs').select('id', {count: 'exact'});
  q = q.or('breakdown_end_date.is.null');
  q = q.or('responsibility.ilike.%FSD%,responsibility.is.null');
  
  const { count } = await q;
  console.log('Chained OR count:', count);
}
test();
