const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://pfqaeewmlwfayxbgmuaq.supabase.co", (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })()));

async function testInsert() {
  const payload = {
    name: 'Tafadzwa',
    surname: 'Tar',
    dob: '2026-09-03',
    gender: 'Male',
    phone_number: '+263778995',
    national_id: '',
    ibu: 'IEG',
    division: 'Omnis',
    job_title: '',
    next_of_kin: '+263779885'
  };

  const { data, error } = await supabase.from('omnis_patients').insert(payload);
  console.log('Error:', error);
}

testInsert();
