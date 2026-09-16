require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const path = require('path');

// Supabase details
const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
if (!SERVICE_KEY) { console.error('❌ SUPABASE_SERVICE_KEY not set'); process.exit(1); }
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
        console.log(`Found ${products.length} products to migrate.\n`);

        let successCount = 0;
        let failCount = 0;

        for (const product of products) {
            try {
                const fileUrl = `${FRAPPE_URL}${product.spec_sheet_url}`;
                console.log(`📥 Downloading ${product.item_code}: ${fileUrl}`);
                
                // Download file from Frappe
                const response = await axios.get(fileUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 30000 // 30s timeout
                });
                const buffer = Buffer.from(response.data, 'binary');
                console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
                
                const fileName = path.basename(product.spec_sheet_url);
                // Sanitise the filename for storage
                const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
                const storagePath = `spec_sheets/${Date.now()}_${safeName}`;

                console.log(`📤 Uploading to Supabase: ${storagePath}`);
                
                // Upload to Supabase Storage
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

                console.log(`✅ ${product.item_code} → ${publicUrl}\n`);
                successCount++;

                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 500));
            } catch (err) {
                const msg = err.response ? `HTTP ${err.response.status} ${err.response.statusText}` : err.message;
                console.error(`❌ Failed ${product.item_code}: ${msg}\n`);
                failCount++;
            }
        }
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Migration complete. Success: ${successCount}, Failed: ${failCount}`);
        console.log(`${'='.repeat(50)}`);
    } catch(err) {
        console.error("Fatal error:", err);
    }
}

migrateSpecs();
