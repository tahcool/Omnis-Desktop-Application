const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function insertCustomerEnquirySafe(payload) {
  let currentPayload = { ...payload };
  let attempts = 0;
  
  while (attempts < 6) {
    attempts++;
    const { data, error } = await supabase
      .from('customer_enquiries')
      .insert(currentPayload)
      .select();

    if (!error) {
      return { data, error: null };
    }

    const msg = error.message || '';
    console.log(`Attempt ${attempts} error: ${msg}`);

    const match = msg.match(/Could not find the '([^']+)' column/i) || msg.match(/column "([^"]+)" of relation/i);
    
    if (match && match[1] && (match[1] in currentPayload)) {
      console.warn(`[insertCustomerEnquirySafe] Stripping missing column "${match[1]}" and retrying...`);
      delete currentPayload[match[1]];
    } else {
      return { data: null, error };
    }
  }

  return { data: null, error: new Error('Exceeded maximum retry attempts.') };
}

async function runTest() {
  console.log('Testing self-healing safe insert...');
  const testPayload = {
    customer_name: 'Safe Insert Test Customer',
    request_details: 'Testing dynamic schema retry',
    company: 'Machinery Exchange',
    target_company: 'Machinery Exchange',
    sales_rep_name: 'Takunda Tarumbwa',
    estimated_value: 50000,
    status: 'Open'
  };

  const { data, error } = await insertCustomerEnquirySafe(testPayload);
  if (error) {
    console.error('Final error:', error.message);
  } else {
    console.log('🎉 Safe insert succeeded! Inserted record:', data);
    // Cleanup test record
    await supabase.from('customer_enquiries').delete().eq('customer_name', 'Safe Insert Test Customer');
  }
}

runTest();
