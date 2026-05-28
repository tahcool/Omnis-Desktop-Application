import codecs
import re

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

# Replace the first callFrappe for DBR
# Note: we need to find the function that contains this.
# It seems to be async function loadBreakdownData(filters) or similar.
target1_regex = r'const raw = await callFrappe\(FT_BREAKDOWN_DBR_METHOD, filters, \'GET\', \{\s*showLoader: true,\s*loaderMsg: "Syncing Breakdowns"\s*\}\);.*?const data = raw\.message \|\| \{\};'

replacement1 = '''// Fetch native Supabase data for Breakdowns
        showToast("Syncing Breakdowns...", "info", 1500);
        
        let filterOpts = {
          table: 'ft_breakdown_log',
          method: 'select',
          params: { columns: '*' }
        };
        
        // Add basic filters
        if (filters && Object.keys(filters).length > 0) {
            filterOpts.params.match = {};
            if (filters.region) filterOpts.params.match.region = filters.region;
            if (filters.customer) filterOpts.params.match.customer = filters.customer;
            if (filters.machine) filterOpts.params.match.machine = filters.machine;
            // Open filter by default:
            if (!filters.show_closed) filterOpts.params.match.end_date = null;
            
            if (Object.keys(filterOpts.params.match).length === 0) {
                delete filterOpts.params.match;
            }
        } else {
            // Default: only open breakdowns
            filterOpts.params.match = { end_date: null };
        }
        
        const raw = await window.electron.invoke('supabase:query', filterOpts);
        
        if (!raw || raw.error) {
            let msg = raw?.error?.message || "Failed to load breakdowns from Supabase";
            showToast("Breakdown sync error: " + msg, "err", 4500);
            return;
        }
        
        const data = { breakdowns: raw.data || [] };'''

content, c1 = re.subn(target1_regex, replacement1, content, flags=re.DOTALL)

# Replace the second callFrappe for checking supervisor approved
target2_regex = r'const method = \(typeof FT_BREAKDOWN_DBR_METHOD !== \'undefined\'\) \? FT_BREAKDOWN_DBR_METHOD : "mxg_fleet_track\.omnis_dashboard\.ft_breakdown_dashboard\.get_ft_breakdown_dbr_v2";\s*const res = await callFrappe\(method, \{ _ts: Date\.now\(\) \}\);\s*const data = res\.message \|\| \{\};\s*const breakdowns = data\.breakdowns \|\| \[\];'

replacement2 = '''const res = await window.electron.invoke('supabase:query', {
          table: 'ft_breakdown_log',
          method: 'select',
          params: { columns: '*', match: { end_date: null } }
        });
        const breakdowns = res.data || [];'''

content, c2 = re.subn(target2_regex, replacement2, content, flags=re.DOTALL)

if c1 > 0 or c2 > 0:
    with codecs.open('index.html', 'w', 'utf-8') as f:
        f.write(content)
    print(f"Replaced DBR fetches (c1={c1}, c2={c2})")
else:
    print("Could not find the DBR target patterns")

