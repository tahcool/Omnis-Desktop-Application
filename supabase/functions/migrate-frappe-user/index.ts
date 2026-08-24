import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, frappe_usr, password, frappe_url } = await req.json()

    if (!email || !password || !frappe_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Verify credentials with Frappe
    const loginUrl = `${frappe_url.replace(/\/$/, '')}/api/method/login`
    const frappeUsername = frappe_usr || email
    const frappeRes = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: `usr=${encodeURIComponent(frappeUsername)}&pwd=${encodeURIComponent(password)}`
    })

    const frappeData = await frappeRes.json()

    // Frappe returns 200 OK and { message: "Logged In" } on success.
    // If it fails, it usually returns 401 or { message: "Invalid Login" }
    if (!frappeRes.ok || frappeData.message !== 'Logged In') {
      console.error("Frappe verification failed", frappeData)
      return new Response(JSON.stringify({ error: 'Invalid credentials in legacy system' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Credentials verified. Create or update user in Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers()
    if (listError) {
      throw listError
    }

    const existingUser = existingUsers.users.find(u => u.email === email)

    if (existingUser) {
      // User exists, just update their password to match Frappe
      const { data, error } = await supabaseClient.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: password,
          user_metadata: { display_name: frappeUsername, full_name: frappeUsername }
        }
      )
      if (error) throw error
    } else {
      // Create new user
      const { data, error } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm since they are an existing Frappe user
        user_metadata: { display_name: frappeUsername, full_name: frappeUsername }
      })
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true, message: 'User migrated successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error("Migration Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
