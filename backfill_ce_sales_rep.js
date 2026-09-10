const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPA_SERVICE = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());
const supabase = createClient(SUPA_URL, SUPA_SERVICE);

async function run() {
  const { data: ces, error } = await supabase
    .from('customer_enquiries')
    .select('id, submitted_by')
    .is('sales_rep_name', null)
    .not('submitted_by', 'is', null);

  if (error) {
    console.error('Error fetching CEs:', error);
    return;
  }

  console.log(`Found ${ces.length} CEs missing sales_rep_name`);

  for (const ce of ces) {
    if (!ce.submitted_by) continue;

    const { data: userResp, error: uErr } = await supabase.auth.admin.getUserById(ce.submitted_by);
    
    if (uErr) {
      console.error(`Error fetching user ${ce.submitted_by}:`, uErr.message);
      continue;
    }

    const user = userResp?.user;
    if (user) {
      const meta = user.user_metadata || {};
      const metaName = meta.full_name || meta.name || meta.display_name;
      const formattedEmailName = (user.email || '').split('@')[0].split(/[._-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const salesRepName = metaName?.trim() || formattedEmailName || 'Representative';

      console.log(`Updating CE ${ce.id} to Sales Rep: ${salesRepName}`);

      const { error: updErr } = await supabase
        .from('customer_enquiries')
        .update({ sales_rep_name: salesRepName })
        .eq('id', ce.id);

      if (updErr) {
        console.error(`Failed to update ${ce.id}:`, updErr.message);
      }
    }
  }
  console.log('Done backfilling.');
}
run();
