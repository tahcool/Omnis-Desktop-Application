require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FRA_URL = 'https://powertrack.powerstar.co.zw/api/method/frappe.client.get_list';
const FRA_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'token f7a7d769fa195b1:72943eaf41ee6f0'
};

async function syncDefects() {
  console.log('Fetching Defects Log from Powerstar...');
  try {
    const res = await fetch(FRA_URL, {
      method: 'POST',
      headers: FRA_HEADERS,
      body: JSON.stringify({
        doctype: 'Defects Log',
        fields: ['*'],
        limit_page_length: 5000
      })
    });
    
    const data = await res.json();
    if (data.exc) {
      console.error('Frappe error:', data.exc);
      return;
    }
    
    const defects = data.message || [];
    console.log(`Found ${defects.length} defects to sync.`);
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < defects.length; i += BATCH_SIZE) {
      const batch = defects.slice(i, i + BATCH_SIZE);
      const upsertData = batch.map(d => ({
        name: d.name,
        defect_type: d.defect_type || 'Minor',
        machine: d.lbz || d.reg_number || 'Unknown',
        customer: d.client_name || d.client || 'Unknown',
        oem: d.make || 'Powerstar',
        model: d.model || 'Unknown',
        warranty_status: d.warranty_status || 'N/A',
        start_date: d.start_date || d.creation.split(' ')[0],
        priority: d.importance || 'Low',
        status: d.status || 'open',
        description: d.description || '',
        on_hold: d.on_hold === 1 ? 'Yes' : 'No',
        ted: d.ted || null,
        end_date: d.end_date || null,
        defect_days: d.defect_days || 0,
        technician: d.technician || '',
        hmr_at_defect: d.reading_at_defect || 0,
        solution: d.solution || '',
        red: d.red || null,
        ted_status: d.ted_status || 'TBA',
        parts_eta: d.parts_eta || null,
        created_at: d.creation,
        modified_at: d.modified
      }));
      
      const { error } = await supabase
        .from('ft_defect')
        .upsert(upsertData, { onConflict: 'name', ignoreDuplicates: true });
        
      if (error) {
        console.error('Error inserting defects batch:', error);
      } else {
        console.log(`Synced batch ${i/BATCH_SIZE + 1} (${upsertData.length} records)`);
      }
    }
    console.log('Finished syncing Powerstar defects.');
  } catch (err) {
    console.error('Error:', err);
  }
}

syncDefects();
