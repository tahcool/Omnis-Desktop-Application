# Skill: Replacing a callFrappe() Call with Supabase

## Overview
Every `callFrappe()` call in `systems/fleetrack/index.html` must be replaced with
a Supabase query via the `supabase:query` IPC channel. This skill documents exactly
how to do this safely.

## Step-by-Step Process

### 1. Identify the Frappe endpoint
```javascript
// Example to replace:
const res = await callFrappe(
  '/api/method/mxg_fleet_track.ft_machine_register.get_ft_machine_register',
  { region: selectedRegion },
  'GET'
);
```

### 2. Check the frappe_api_map
Before writing any replacement, check `fleetrack/frappe_api_map.md` to see if the
mapping has already been documented. If not, document it first.

### 3. Verify the Supabase table exists and has the needed columns
```javascript
// Via MCP: supabase_query({ table: 'ft_machine', select: '*', limit: 1 })
// Or from MCP: get_shared_context() → database_schema.md
```

### 4. Write the replacement
```javascript
// BEFORE:
const raw = await callFrappe(FT_MACHINE_REGISTER_METHOD, filters, 'GET', { showLoader: false });
const machines = raw?.message || [];

// AFTER:
const res = await window.electron.invoke('supabase:query', {
  table: 'ft_machine',
  method: 'select',
  params: {
    columns: 'name,model,oem,sn,fleet_no,customer,region,location,current_hmr,machine_picture,warranty_status,service_obligation',
    filters: filters.region ? { region: filters.region } : {},
    order: { column: 'name', ascending: true }
  }
});
if (!res?.ok) { console.error('[MR] Supabase error:', res?.error); return; }
const machines = res.data || [];
```

### 5. Handle the data shape difference
Frappe returns `{ message: [...] }` — Supabase returns the array directly.
Always replace `raw?.message` or `raw?.data?.message` with just `res.data`.

### 6. Handle writes (POST/mutations)
```javascript
// BEFORE: create_ft_breakdown_log
const res = await callFrappe('/api/method/...create_ft_breakdown_log', payload, 'POST');

// AFTER:
const res = await window.electron.invoke('supabase:query', {
  table: 'ft_breakdown',
  method: 'insert',
  params: {
    data: {
      machine_id: payload.machine,
      description: payload.description,
      status: 'Open',
      opened_at: new Date().toISOString(),
      region: payload.region,
      customer: payload.customer
    }
  }
});
```

### 7. Validate after the change
- Run `validate_html_syntax("fleetrack")` via MCP
- Manually test the UI feature that was changed
- Check browser console for errors

### 8. Update the API map
After successfully replacing a call, update `fleetrack/frappe_api_map.md` via:
```
save_session_notes("fleetrack", "✅ Replaced: get_ft_machine_register → ft_machine SELECT", "frappe_api_map")
```

## Common Pitfalls

### ❌ Don't assume field names are the same
Frappe DocType field names often differ from Supabase column names.
Always check the actual `ft_machine` schema first.

### ❌ Don't forget related table data
Some Frappe endpoints return joined data. In Supabase you need multiple queries or
a view. Plan the data shape before writing code.

### ❌ Don't break the loading state
`callFrappe()` has built-in `showLoader` handling. Supabase queries don't.
Preserve any existing loading/error state management around the call.
