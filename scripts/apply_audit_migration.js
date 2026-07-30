const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testAuditAndHotLead() {
  console.log('Testing omnis_audit_trail table...');
  const { data: auditData, error: auditErr } = await supabase
    .from('omnis_audit_trail')
    .select('*')
    .limit(1);

  console.log('omnis_audit_trail status:', auditErr ? auditErr.message : 'Table accessible!');

  console.log('Testing customer_enquiries columns...');
  const { data: enqData, error: enqErr } = await supabase
    .from('customer_enquiries')
    .select('id, is_hot_lead, is_deleted, pdf_url')
    .limit(1);

  console.log('customer_enquiries hot_lead status:', enqErr ? enqErr.message : 'Columns exist or accessible!');
}

testAuditAndHotLead();
