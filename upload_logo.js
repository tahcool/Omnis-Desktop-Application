const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://pfqaeewmlwfayxbgmuaq.supabase.co',
  (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })())
);

async function upload() {
  const filePath = 'C:\\Projects\\Company Logos\\IEG\\PNGs\\Proudly IEG Logo (White)@3x.png';
  const fileBody = fs.readFileSync(filePath);
  
  const { data, error } = await supabase.storage
    .from('public-assets')
    .upload('logos/proudly-ieg-logo-white-3x.png', fileBody, {
      contentType: 'image/png',
      upsert: true
    });
    
  if (error) {
    console.error('Upload Error:', error);
  } else {
    console.log('Upload Success:', data);
    const publicUrl = supabase.storage.from('public-assets').getPublicUrl('logos/proudly-ieg-logo-white-3x.png');
    console.log('Public URL:', publicUrl.data.publicUrl);
  }
}

upload();
