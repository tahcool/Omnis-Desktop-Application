require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const POWERSTAR_API_URL = 'https://powertrack.powerstar.co.zw/api/resource';
const POWERSTAR_AUTH = 'token f7a7d769fa195b1:72943eaf41ee6f0';

async function syncPowerstar() {
  console.log("Starting Powerstar Sync...");

  // 1. Sync Clients
  console.log("Fetching Clients from Powerstar...");
  let clientsResp = await fetch(`${POWERSTAR_API_URL}/Client?fields=["name","client_name","has_trucks_on_powertrack"]&limit_page_length=1000`, {
    headers: { 'Authorization': POWERSTAR_AUTH }
  });
  let clientsData = await clientsResp.json();
  let clients = clientsData.data || [];
  console.log(`Found ${clients.length} clients.`);

  let customersToUpsert = [];
  for (let c of clients) {
    customersToUpsert.push({
      name: c.name, // The ID in Frappe
      customer_name: c.client_name,
      division: 'powerstar'
    });
  }

  if (customersToUpsert.length > 0) {
    console.log("Upserting Clients into Supabase...");
    const { error } = await supabase.from('ft_customer').upsert(customersToUpsert, { onConflict: 'name', ignoreDuplicates: true });
    if (error) console.error("Error upserting clients:", error);
    else console.log("Clients synced successfully.");
  }

  // 2. Sync Trucks
  console.log("Fetching Trucks from Powerstar...");
  let trucksResp = await fetch(`${POWERSTAR_API_URL}/Truck?fields=["name","client","make","model","fleet_no","lbz","engine_type","location","type","service_branch"]&limit_page_length=2000`, {
    headers: { 'Authorization': POWERSTAR_AUTH }
  });
  let trucksData = await trucksResp.json();
  let trucks = trucksData.data || [];
  console.log(`Found ${trucks.length} trucks.`);

  let machinesToUpsert = [];
  for (let t of trucks) {
    machinesToUpsert.push({
      name: t.name, // The ID in Frappe (Truck Name)
      customer: t.client,
      oem: t.make, // mapped from 'make'
      model: t.model,
      fleet_no: t.fleet_no,
      sn: t.lbz, // Serial Number / Chassis Number
      engine_type: t.engine_type,
      location: t.location,
      type: t.type,
      region: t.service_branch,
      division: 'powerstar'
    });
  }

  if (machinesToUpsert.length > 0) {
    console.log("Upserting Trucks into Supabase...");
    const { error } = await supabase.from('ft_machine').upsert(machinesToUpsert, { onConflict: 'name', ignoreDuplicates: true });
    if (error) console.error("Error upserting trucks:", error);
    else console.log("Trucks synced successfully.");
  }

  console.log("Powerstar Sync Complete.");
}

syncPowerstar();
