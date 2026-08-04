require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FRA_URL = 'https://powertrack.powerstar.co.zw/api/method/frappe.client.get_list';
const FRA_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'token f7a7d769fa195b1:72943eaf41ee6f0'
};

function generateUUID(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

async function syncBreakdowns() {
  console.log('Fetching Breakdown Log from Powerstar...');
  try {
    const res = await fetch(FRA_URL, {
      method: 'POST',
      headers: FRA_HEADERS,
      body: JSON.stringify({
        doctype: 'Breakdown Log',
        fields: ['*'],
        limit_page_length: 5000
      })
    });
    
    const data = await res.json();
    if (data.exc) {
      console.error('Frappe error:', data.exc);
      return;
    }
    
    const breakdowns = data.message || [];
    console.log(`Found ${breakdowns.length} breakdowns to sync.`);
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < breakdowns.length; i += BATCH_SIZE) {
      const batch = breakdowns.slice(i, i + BATCH_SIZE);
      const upsertData = batch.map(d => {
        const bdId = generateUUID('powerstar-bd-' + d.name);
        return {
          id: bdId,
          frappe_name: d.name,
          machine: d.lbz || d.reg_number || 'Unknown',
          model: d.model || 'Unknown',
          customer: d.client || d.client_name || 'Unknown',
          region: d.location || 'Unknown',
          warranty_status: d.warranty_status || 'N/A',
          description: d.description || '',
          breakdown_date: d.breakdown_date || d.creation.split(' ')[0],
          breakdown_end_date: d.end_date || null,
          urgent: d.urgent === 1,
          on_hold: d.on_hold === 1,
          is_the_machine_still_running: d.is_the_machine_still_running || 'No',
          responsibility: d.resp || 'WSD',
          status: d.status || 'open',
          parts_eta: d.parts_eta || null,
          ted_status: d.ted_status || 'TBA',
          ted: d.ted || null,
          red: d.red || null,
          out_eta: d.outwork_eta || null,
          created_at: d.creation,
          updated_at: d.modified,
          division: 'sinopower'
        };
      });
      
      const { error } = await supabase
        .from('ft_breakdown_logs')
        .upsert(upsertData, { onConflict: 'id', ignoreDuplicates: true });
        
      if (error) {
        console.error('Error inserting breakdowns batch:', error);
      } else {
        console.log(`Synced batch ${Math.floor(i/BATCH_SIZE) + 1} (${upsertData.length} records)`);
      }
    }
    console.log('Finished syncing Powerstar breakdowns.');
  } catch (err) {
    console.error('Error:', err);
  }
}

syncBreakdowns();
