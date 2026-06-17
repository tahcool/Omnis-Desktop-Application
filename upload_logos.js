const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function uploadLogos() {
    const bucket = 'public-assets';
    try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) throw bucketsError;
        
        let bucketExists = buckets.some(b => b.name === bucket);
        if (!bucketExists) {
            const { data, error } = await supabase.storage.createBucket(bucket, { public: true });
            if (error) throw error;
            console.log("Bucket created");
        } else {
             // ensure it's public
             await supabase.storage.updateBucket(bucket, { public: true });
        }
        
        const mxgLogo = fs.readFileSync('C:\\Projects\\Company Logos\\MXG\\PNGs\\MXG Logo.png');
        const spzLogo = fs.readFileSync('C:\\Projects\\Company Logos\\SPZ\\SPZ Full Logo (White)@3x.png');
        
        const { data: mxgData, error: mxgError } = await supabase.storage.from(bucket).upload('logos/mxg-logo.png', mxgLogo, { upsert: true, contentType: 'image/png' });
        if (mxgError) throw mxgError;
        
        const { data: spzData, error: spzError } = await supabase.storage.from(bucket).upload('logos/spz-logo.png', spzLogo, { upsert: true, contentType: 'image/png' });
        if (spzError) throw spzError;
        
        const mxgUrl = supabase.storage.from(bucket).getPublicUrl('logos/mxg-logo.png').data.publicUrl;
        const spzUrl = supabase.storage.from(bucket).getPublicUrl('logos/spz-logo.png').data.publicUrl;
        
        console.log("MXG:", mxgUrl);
        console.log("SPZ:", spzUrl);
    } catch(e) {
        console.error(e);
    }
}
uploadLogos();
