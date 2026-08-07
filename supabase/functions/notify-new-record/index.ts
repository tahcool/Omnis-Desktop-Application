import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const payload = await req.json();

    const table = payload.table;
    const record = payload.record;
    
    if (!record || (payload.type !== 'INSERT' && payload.type !== 'UPDATE')) {
      return new Response(JSON.stringify({ message: "Not an insert/update or missing record" }), { status: 200 })
    }

    let title = 'New Notification';
    let body = 'A new record was added.';
    // include full record in push data for modal rendering
    const pushData = { table, recordId: record.id || record.name, fullRecord: record };

    if (table === 'ft_machine') {
      const sn = record.sn || record.name || 'Unknown';
      const model = record.model || 'Unknown Model';
      const customer = record.customer || 'Unknown Customer';
      title = `New Machine Registered`;
      body = `${customer} | ${model} (SN: ${sn})`;
    } else if (table === 'ft_breakdown' || table === 'ft_breakdown_logs' || table === 'ft_breakdown_log') {
      const sn = record.sn || record.machine || 'Unknown SN';
      const desc = record.description || record.reported_issue || record.reported_problem || 'New breakdown reported';
      title = `New Breakdown Reported`;
      body = `[${sn}] - ${desc}`;
    } else if (table === 'ft_defect' || table === 'ft_defects_log' || table === 'ft_defect_log') {
      const sn = record.sn || record.machine || 'Unknown SN';
      const desc = record.defect || record.description || 'New defect added';
      title = `New Defect Added`;
      body = `[${sn}] - ${desc}`;
    } else if (table === 'fmb_reports') {
      title = `Order Updated`;
      body = `Order ${record.name || record.id} was updated. Status: ${record.status || 'Changed'}`;
    } else if (table === 'frappe_group_sales') {
      title = `New Sales Entry`;
      body = `Sale for ${record.customer || 'Unknown'} - ${record.item || record.model || 'Item'}`;
    } else if (table === 'stock_inventory') {
      title = `New Stock Added`;
      body = `${record.name || 'Stock Item'} added to inventory.`;
    } else if (table === 'aftersales_handover') {
      title = `New Aftersales Record`;
      body = `Aftersales for Order ${record.order_id || 'Unknown'}`;
    } else {
      return new Response(JSON.stringify({ message: `Ignoring table: ${table}` }), { status: 200 })
    }

    // Fetch tokens
    const { data: tokensData, error } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token');

    if (error || !tokensData || tokensData.length === 0) {
      console.log('No push tokens found or error fetching tokens', error);
      return new Response(JSON.stringify({ message: "No tokens found" }), { status: 200 })
    }

    // Expo push tokens
    const expoPushTokens = tokensData
      .map(t => t.expo_push_token)
      .filter(token => token && token.startsWith('ExponentPushToken'));

    if (expoPushTokens.length === 0) {
      return new Response(JSON.stringify({ message: "No valid Expo push tokens found" }), { status: 200 })
    }

    // Build Expo messages
    const messages = expoPushTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: pushData,
    }));

    // Send to Expo
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    return new Response(JSON.stringify({ success: true, expoResult }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error('Error handling webhook', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
