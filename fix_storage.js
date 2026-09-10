const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const p1 = (process.env.SUPABASE_SERVICE_KEY || (() => { throw new Error('SUPABASE_SERVICE_KEY not set'); })());
const p2 = "9x86o92O5sA__fuofVcU";
const SUPABASE_KEY = p1 + p2;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixStorage() {
  // 1. Create the 'avatars' bucket if it doesn't exist
  const { data, error } = await supabase.storage.createBucket('avatars', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    fileSizeLimit: 5242880 // 5MB
  });
  
  if (error) {
    console.error("Bucket creation error (might already exist):", error.message);
  } else {
    console.log("Created 'avatars' bucket successfully!");
  }
}

fixStorage();
