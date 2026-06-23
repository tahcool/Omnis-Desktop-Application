const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = "sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc";

async function testEdgeFunction() {
    console.log("Triggering Edge Function...");
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/daily-quote-reminders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const status = response.status;
        const text = await response.text();
        console.log(`Status: ${status}`);
        console.log(`Response: ${text}`);
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testEdgeFunction();
