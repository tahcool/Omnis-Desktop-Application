require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const https = require('https');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FRA_BASE = 'https://powertrack.powerstar.co.zw';
const FRA_HEADERS = {
  'Authorization': 'token f7a7d769fa195b1:72943eaf41ee6f0'
};

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: FRA_HEADERS }, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpeg' || ext === '.jpg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

async function migrateImages() {
  console.log('Fetching machines with Frappe image paths...');
  const { data: machines, error } = await supabase
    .from('ft_machine')
    .select('name, sn, machine_picture')
    .like('machine_picture', '/%');

  if (error) {
    console.error('Error fetching machines:', error);
    return;
  }

  console.log(`Found ${machines.length} machines to migrate.`);

  let successCount = 0;
  let failCount = 0;

  for (const m of machines) {
    try {
      const frappeUrl = FRA_BASE + encodeURI(m.machine_picture);
      const fileName = path.basename(m.machine_picture);
      const ext = path.extname(fileName) || '.jpeg';
      const sn = m.sn || m.name.replace(/[^a-zA-Z0-9]/g, '_');
      
      const tmpPath = path.join(__dirname, 'tmp_' + fileName.replace(/[^a-zA-Z0-9.]/g, '_'));
      
      // Download from Frappe
      await downloadFile(frappeUrl, tmpPath);

      // Upload to Supabase
      const storagePath = `${sn}/cover${ext}`;
      const fileBuffer = fs.readFileSync(tmpPath);
      const contentType = getContentType(tmpPath);
      
      const { error: uploadError } = await supabase.storage
        .from('machine-images')
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      fs.unlinkSync(tmpPath); // Cleanup

      // Update DB
      const { data: urlData } = supabase.storage.from('machine-images').getPublicUrl(storagePath);
      const newUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('ft_machine')
        .update({ machine_picture: newUrl })
        .eq('name', m.name);

      if (updateError) {
        throw updateError;
      }

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`Migrated ${successCount}/${machines.length}...`);
      }
    } catch (err) {
      failCount++;
      console.error(`Error migrating machine ${m.name} (${m.machine_picture}):`, err.message);
    }
  }

  console.log(`Migration complete. Success: ${successCount}, Failed: ${failCount}`);
}

migrateImages();
