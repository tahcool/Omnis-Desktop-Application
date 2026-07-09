const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

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
