const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function uploadAllLogos() {
    const bucket = 'public-assets';
    const logos = [
        { path: 'C:\\Users\\Administrator\\omnis\\assets\\images\\MXG Logo.png', name: 'logos/mxg-logo.png' },
        { path: 'C:\\Users\\Administrator\\omnis\\assets\\images\\Shantui_logo.png', name: 'logos/shantui-logo.png' },
        { path: 'C:\\Users\\Administrator\\omnis\\assets\\images\\Hitachi_logo.png', name: 'logos/hitachi-logo.png' }
    ];

    for (const logo of logos) {
        if (fs.existsSync(logo.path)) {
            const buf = fs.readFileSync(logo.path);
            const { error } = await supabase.storage.from(bucket).upload(logo.name, buf, { upsert: true, contentType: 'image/png' });
            if (error) console.error("Error uploading", logo.name, error);
            else console.log("Uploaded", logo.name);
        } else {
            console.warn("File not found:", logo.path);
        }
    }
}
uploadAllLogos();
