import { supabase } from './supabaseClient';

export async function fetchCustomers(query: string): Promise<string[]> {
  const q = (query || '').trim();
  try {
    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from('customers').select('customer_name').ilike('customer_name', `%${q}%`).limit(15),
      supabase.from('customer_enquiries').select('customer_name').ilike('customer_name', `%${q}%`).limit(15),
      supabase.from('aftersales_handover_records').select('company').ilike('company', `%${q}%`).limit(15),
      supabase.from('psv_logs').select('customer_name').ilike('customer_name', `%${q}%`).limit(15),
    ]);

    const names = new Set<string>();
    (r1.data || []).forEach((c: any) => c.customer_name && names.add(c.customer_name.trim()));
    (r2.data || []).forEach((c: any) => c.customer_name && names.add(c.customer_name.trim()));
    (r3.data || []).forEach((c: any) => c.company && names.add(c.company.trim()));
    (r4.data || []).forEach((c: any) => c.customer_name && names.add(c.customer_name.trim()));

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  } catch (e) {
    console.error('[fetchCustomers] error:', e);
    return [];
  }
}

export async function insertCustomerEnquirySafe(payload: Record<string, any>): Promise<{ data: any; error: any }> {
  let currentPayload = { ...payload };
  let attempts = 0;
  
  while (attempts < 6) {
    attempts++;
    const { data, error } = await supabase
      .from('customer_enquiries')
      .insert(currentPayload)
      .select();

    if (!error) {
      return { data, error: null };
    }

    const msg = error.message || '';
    const match = msg.match(/Could not find the '([^']+)' column/i) || msg.match(/column "([^"]+)" of relation/i);
    
    if (match && match[1] && (match[1] in currentPayload)) {
      console.warn(`[insertCustomerEnquirySafe] Stripping missing column "${match[1]}" and retrying...`);
      delete currentPayload[match[1]];
    } else {
      return { data: null, error };
    }
  }

  return { data: null, error: new Error('Exceeded maximum retry attempts.') };
}
