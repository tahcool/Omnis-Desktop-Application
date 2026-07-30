const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with the SERVICE ROLE KEY
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function importUsers() {
  const csvPath = './frappe_users.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Please download the User List from Frappe and save it as ${csvPath}`);
    return;
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  
  // Parse the CSV
  // The Frappe export usually has metadata rows at the top. We need to skip them.
  // We'll just read lines and find where the actual header starts.
  let lines = fileContent.split(/\r?\n/);
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('ID') && lines[i].includes('Full Name')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex !== -1) {
    lines = lines.slice(headerIndex);
  }

  const records = parse(lines.join('\n'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`Found ${records.length} users in the CSV.`);

  for (const row of records) {
    // Frappe User export usually has "Email" and "Full Name"
    const email = row['Email'] || row['ID'] || row['name']; 
    const fullName = row['Full Name'] || row['full_name'] || '';

    if (!email || !email.includes('@')) {
      console.log(`Skipping invalid email: ${email}`);
      continue;
    }

    console.log(`Creating user: ${email}...`);

    // Create the user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: 'ChangeMe@2026', // A temporary password for everyone
      email_confirm: true,       // Mark their email as verified so they can log in immediately
      user_metadata: {
        full_name: fullName
      }
    });

    if (error) {
      if (error.message.includes('already has an account')) {
        console.log(`  - ${email} already exists in Supabase. Skipping.`);
      } else {
        console.error(`  - Error creating ${email}:`, error.message);
      }
    } else {
      console.log(`  - Successfully created ${email}`);
    }
  }

  console.log('Import complete!');
}

importUsers();
