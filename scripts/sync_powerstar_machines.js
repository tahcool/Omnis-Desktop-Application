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

async function syncMachines() {
  console.log('Fetching Trucks from Powerstar...');
  try {
    const res = await fetch(FRA_URL, {
      method: 'POST',
      headers: FRA_HEADERS,
      body: JSON.stringify({
        doctype: 'Truck',
        fields: ['*'],
        limit_page_length: 5000
      })
    });
    
    const data = await res.json();
    if (data.exc) {
      console.error('Frappe error:', data.exc);
      return;
    }
    
    const machines = data.message || [];
    console.log(`Found ${machines.length} trucks to sync.`);
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < machines.length; i += BATCH_SIZE) {
      const batch = machines.slice(i, i + BATCH_SIZE);
      const upsertData = batch.map(m => ({
        name: m.name,
        division: 'sinopower',
        model: m.model || 'Unknown',
        oem: m.make || 'Powerstar',
        sn: m.reg_number || m.lbz || '',
        fleet_no: m.fleet_no || '',
        location: m.location || '',
        region: m.region || 'North',
        customer: m.client_name || m.client || 'Unknown',
        warranty_status: m.warranty_status || 'N/A',
        warranty_type: m.warranty_type || null,
        warranty_period: m.warranty_duration || null,
        warranty_hours: m.expiry_reading || 0,
        expiry_date: m.warranty_expiry_date || null,
        handover_date: m.handover_date || null,
        current_hmr: m.current_reading || 0,
        starting_hmr: m.initial_reading || 0,
        last_hmr_date: m.last_reading_date || null,
        days_since_last_hmr: m.days_since_last_reading || 0,
        last_service_date: m.last_service_date || null,
        last_service_hmr: m.last_service_reading || 0,
        next_service_hmr: m.next_service_reading || 0,
        service_interval_hours: m.service_interval || 0,
        track_initial_service: m.track_initial_service === 'Yes' ? 1 : 0,
        initial_service_type: m.initial_service_type || 0,
        initial_service_status: m.initial_service_status || '',
        machine_picture: m.vehicle_image || null,
        wty_certificate: m.wty_certificate || null,
        notes: m.notes || null,
        supplied: m.ptz_supplied || 'Yes',
        mxg_fleet_no: m.customer_fleet_no || null,
        oem_registered: m.oem_registered || 'Not Specified',
        service_tracking_metric: m.service_tracking_metric || 'HMR'
      }));
      
      const { error } = await supabase
        .from('ft_machine')
        .upsert(upsertData, { onConflict: 'name' });
        
      if (error) {
        console.error('Error inserting machines batch:', error);
      } else {
        console.log(`Synced batch ${i/BATCH_SIZE + 1} (${upsertData.length} records)`);
      }
    }
    console.log('Finished syncing Powerstar machines.');
  } catch (err) {
    console.error('Error:', err);
  }
}

syncMachines();
