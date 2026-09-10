import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
// Publishable anon/public key — safe to include in client builds.
// The service role key must NEVER be included here.
//
// Configuration: Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.
// Expo SDK 49+ automatically exposes EXPO_PUBLIC_ prefixed vars to the JS bundle.
// This works in both `expo start` (dev) and EAS Build (production).
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_ANON_KEY) {
  throw new Error(
    '[FATAL] EXPO_PUBLIC_SUPABASE_ANON_KEY is not set.\n' +
    'Add it to your .env file:\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key-here\n' +
    'Get the anon/public key from: Supabase Dashboard → Settings → API → Project API keys'
  );
}

// Custom SecureStore adapter so Supabase sessions persist across app restarts
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Get the currently logged-in user's profile from user_profiles table.
 * Falls back to parsing the auth.user email if profile doesn't exist yet.
 */
export async function getCurrentUserProfile() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) return profile;

  // Fallback: construct from email
  const emailName = (user.email || '').split('@')[0];
  const fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
  return {
    id: user.id,
    email: user.email,
    full_name: fullName,
    salesperson_name: emailName,
    company: null,
  };
}
