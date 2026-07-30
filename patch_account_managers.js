const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateCustomers() {
  const fileContent = fs.readFileSync('C:\\Users\\Administrator\\omnis\\Customer.csv', 'utf8');
  let lines = fileContent.split(/\r?\n/);
  
  let start_index = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Start entering data below this line')) {
      start_index = i + 1;
      break;
    }
  }

  const dataLines = lines.slice(start_index);
  
  const records = parse(dataLines.join('\n'), {
    columns: false,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`Found ${records.length} records. Extracting account managers...`);

  const updates = [];
  
  for (const row of records) {
    if (row.length > 19) {
      const frappe_id = row[1].replace(/"/g, '').trim();
      const customer_name = row[2].replace(/"/g, '').trim();
      let last_visit_date = row[15] ? row[15].trim() : null;
      const account_manager = row[16] ? row[16].trim() : null;

      if (last_visit_date) {
        const parts = last_visit_date.split('-');
        if (parts.length === 3 && parts[2].length === 4) {
          last_visit_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      if (frappe_id && customer_name && account_manager) {
        updates.push({
          frappe_id,
          account_manager,
          last_visit_date: last_visit_date || null
        });
      }
    }
  }

  console.log(`Found ${updates.length} customers that have an account manager. Updating Supabase...`);

  const batchSize = 100;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    // Using upsert with frappe_id
    // Wait, frappe_id is not the primary key, `id` is a UUID. 
    // Supabase JS upsert requires the target column to be unique if we want to upsert by it.
    // Let's just do individual updates, or fetch all then map.
    // Fetch all customers first to get their UUIDs!
  }
}

// Quickest way to update without UUID mapping:
async function updateLoop(updates) {
  let success = 0;
  for (const u of updates) {
    const { error } = await supabase.from('customers').update({
      account_manager: u.account_manager,
      last_visit_date: u.last_visit_date
    }).eq('frappe_id', u.frappe_id);
    if (!error) success++;
  }
  console.log(`Successfully updated ${success} customers.`);
}

async function run() {
  const fileContent = fs.readFileSync('C:\\Users\\Administrator\\omnis\\Customer.csv', 'utf8');
  let lines = fileContent.split(/\r?\n/);
  
  let start_index = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Start entering data below this line')) {
      start_index = i + 1;
      break;
    }
  }

  const records = parse(lines.slice(start_index).join('\n'), {
    columns: false,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });

  const updates = [];
  for (const row of records) {
    if (row.length > 16) {
      const frappe_id = row[1].replace(/"/g, '').trim();
      let last_visit_date = row[15] ? row[15].trim() : null;
      const account_manager = row[16] ? row[16].trim() : null;

      if (last_visit_date) {
        const parts = last_visit_date.split('-');
        if (parts.length === 3 && parts[2].length === 4) {
          last_visit_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      if (frappe_id && (account_manager || last_visit_date)) {
        updates.push({ frappe_id, account_manager: account_manager || null, last_visit_date: last_visit_date || null });
      }
    }
  }

  console.log(`Updating ${updates.length} customers...`);
  
  // Since we are updating, we can do it in parallel chunks
  const chunkSize = 20;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await Promise.all(chunk.map(u => 
      supabase.from('customers').update({
        account_manager: u.account_manager,
        last_visit_date: u.last_visit_date
      }).eq('frappe_id', u.frappe_id)
    ));
    console.log(`Progress: ${i + chunk.length} / ${updates.length}`);
  }
  console.log('Done!');
}

run();
