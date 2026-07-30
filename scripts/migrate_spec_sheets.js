const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Supabase details
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const FRAPPE_URL = 'https://salestrack.powerstar.co.zw';

async function migrateSpecs() {
    try {
        console.log("Fetching products with Frappe spec sheets...");
        const { data: products, error } = await supabase
            .from('products')
            .select('item_code, spec_sheet_url')
            .like('spec_sheet_url', '/files/%');

        if (error) throw error;
        console.log(`Found ${products.length} products to migrate.`);

        let successCount = 0;
        let failCount = 0;

        for (const product of products) {
            try {
                const fileUrl = `${FRAPPE_URL}${product.spec_sheet_url}`;
                console.log(`Downloading ${fileUrl} for ${product.item_code}...`);
                
                // Download file
                const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data, 'binary');
                
                const fileName = path.basename(product.spec_sheet_url);
                const storagePath = `spec_sheets/${Date.now()}_${fileName}`;

                console.log(`Uploading to Supabase: ${storagePath}...`);
                
                // Upload to Supabase
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('product-assets')
                    .upload(storagePath, buffer, {
                        contentType: 'application/pdf',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: publicUrlData } = supabase.storage.from('product-assets').getPublicUrl(storagePath);
                const publicUrl = publicUrlData.publicUrl;

                // Update database
                const { error: dbError } = await supabase
                    .from('products')
                    .update({ spec_sheet_url: publicUrl })
                    .eq('item_code', product.item_code);

                if (dbError) throw dbError;

                console.log(`✅ Success: ${product.item_code}`);
                successCount++;
            } catch (err) {
                console.error(`❌ Failed ${product.item_code}:`, err.response ? err.response.statusText : err.message);
                failCount++;
            }
        }
        console.log(`\nMigration complete. Success: ${successCount}, Failed: ${failCount}`);
    } catch(err) {
        console.error("Fatal error:", err);
    }
}

migrateSpecs();
