import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

import re

target_pattern = re.compile(r'// Use callFrappe which handles IPC bridge authentication.*?const payload = raw\.message \|\| raw;', re.DOTALL)

replacement = '''// Use Supabase native data
        const showLoader = !overrides.quiet;
        if (showLoader) {
          showToast("Syncing Machines...", "info", 1500);
        }
        
        const filterOpts = {
          table: 'ft_machine',
          method: 'select',
          params: { columns: '*' }
        };
        
        // Map overrides to Supabase match filters if they exist
        if (Object.keys(overrides).length > 0 && !overrides.quiet) {
          filterOpts.params.match = {};
          if (overrides.region) filterOpts.params.match.region = overrides.region;
          if (overrides.customer) filterOpts.params.match.customer = overrides.customer;
          if (overrides.model) filterOpts.params.match.model = overrides.model;
          if (overrides.warranty_status) filterOpts.params.match.warranty_status = overrides.warranty_status;
          
          if (Object.keys(filterOpts.params.match).length === 0) {
            delete filterOpts.params.match;
          }
        }

        const raw = await window.electron.invoke('supabase:query', filterOpts);

        if (!raw || raw.error) {
          let msg = raw?.error?.message || "Failed to load machines from Supabase";
          showToast("Machine register error: " + msg, "err", 4500);
          return;
        }

        const payload = { data: raw.data || [] };'''

new_content, count = target_pattern.subn(replacement, content)

if count > 0:
    with codecs.open('index.html', 'w', 'utf-8') as f:
        f.write(new_content)
    print(f"Successfully replaced callFrappe with Supabase in loadFtMachineRegister ({count} times)")
else:
    print("Could not find the target pattern in index.html")

