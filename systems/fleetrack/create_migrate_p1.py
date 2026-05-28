import codecs

js_content = '''
window.runPhase1Migration = async function() {
    const doctypes = [
        { route: 'FT Customer', table: 'ft_customer' },
        { route: 'FT Region', table: 'ft_region' },
        { route: 'FT Location', table: 'ft_location' },
        { route: 'FT Machine Model', table: 'ft_machine_model' },
        { route: 'FT Machine OEM', table: 'ft_machine_oem' },
        { route: 'FT Machine Type', table: 'ft_machine_type' },
        { route: 'FT Technician', table: 'ft_technician' },
        { route: 'FT BD Category', table: 'ft_bd_category' },
        { route: 'FT Defect Category', table: 'ft_defect_category' }
    ];

    try {
        console.log("Starting Phase 1 Master Data Migration...");
        
        for (const dt of doctypes) {
            console.log(Fetching ...);
            const url = /api/resource/?limit_page_length=99999&fields=["*"];
            
            let records = [];
            try {
                const res = await callFrappe(url, {}, "GET");
                records = res.data || [];
            } catch (err) {
                console.error(Failed to fetch . Make sure your user role has READ access to this Document Type in Frappe!, err);
                continue;
            }
            
            console.log(Found  records for . Inserting...);
            let inserts = 0;
            
            for (const rec of records) {
                // Map the frappe properties directly, dropping frappe-specific metadata
                const payload = {};
                for (const key of Object.keys(rec)) {
                    // Skip frappe metadata fields, keep created/modified if we mapped them
                    if (['name', 'creation', 'modified', 'owner', 'docstatus', 'idx'].includes(key)) continue;
                    payload[key] = rec[key];
                }
                payload['name'] = rec.name;
                
                // Try to upsert
                const ins = await window.electron.invoke('supabase:query', {
                    table: dt.table, method: 'upsert', data: payload
                });
                
                if (ins.error) {
                    console.error(Insert error for  / :, ins.error);
                } else {
                    inserts++;
                }
            }
            console.log(Successfully migrated  records to .);
        }
        
        alert("Phase 1 Migration Complete! Check console for any skipped records.");
        
    } catch (e) {
        console.error("Migration script failed:", e);
        alert("Migration failed. Check console.");
    }
};
'''

with codecs.open('js/migrate_phase1.js', 'w', 'utf-8') as f:
    f.write(js_content)

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

if 'migrate_phase1.js' not in content:
    content = content.replace(
        '<script src="js/migrate_data.js"></script>',
        '<script src="js/migrate_data.js"></script>\n    <script src="js/migrate_phase1.js"></script>'
    )
    with codecs.open('index.html', 'w', 'utf-8') as f:
        f.write(content)

print("Created migrate_phase1.js and injected into index.html")
