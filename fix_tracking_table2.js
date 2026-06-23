const axios  = require('axios');

const PROJECT_REF  = 'pfqaeewmlwfayxbgmuaq';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';

const MGMT_URL = `https://${PROJECT_REF}.supabase.co/rest/v1/sql`;

async function runViaPg(sql) {
  const res = await axios.post(
    MGMT_URL,
    { query: sql },
    {
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation'
      },
      timeout: 60000
    }
  );
  return res.data;
}

async function main() {
    console.log("Running SQL via REST API...");

    const sql = `
        ALTER TABLE public.omnis_tracking_orders 
        ADD COLUMN IF NOT EXISTS linked_sale_name TEXT,
        ADD COLUMN IF NOT EXISTS brand TEXT,
        ADD COLUMN IF NOT EXISTS model TEXT,
        ADD COLUMN IF NOT EXISTS order_date DATE,
        ADD COLUMN IF NOT EXISTS committed_lead_time TEXT,
        ADD COLUMN IF NOT EXISTS revised_handover DATE;
    `;
    
    await runViaPg(sql);
    console.log("Columns added successfully!");
}

main().catch(e => {
    console.error("Error:");
    if (e.response) {
        console.error(e.response.data);
    } else {
        console.error(e.message);
    }
});
