const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://pfqaeewmlwfayxbgmuaq.supabase.co", "sb_secret_JZwRYG9k0mZ9x86o92O5sA__fuofVcU");

async function testInsert() {
  const payload = {
    name: "Tafa",
    surname: "Tar",
    dob: "2026-08-12",
    gender: "Male",
    phone_number: "+2634444",
    national_id: "",
    ibu: "IEG",
    division: "Omnis",
    job_title: "",
    nok_contact: "+26664446",
    address_location: "",
    cohabitants: "",
    nok_address: "",
    blood_type: "",
    background: "",
    chronic_illnesses: "",
    family_history: "",
    current_medications: ""
  };

  const { data, error } = await supabase.from('omnis_patients').insert(payload);
  console.log('Error:', error);
}

testInsert();
