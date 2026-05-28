import codecs

js_content = '''
window.runPhase1Migration = async function() {
    try {
        console.log("Starting Phase 1 Master Data Migration (Data Mining Mode)...");
        
        // 1. Mine data from Machines Register
        console.log("Fetching FT Machines to extract Customers, Regions, Models, Types, Locations...");
        const machinesRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register", {}, "GET");
        const machines = machinesRes.message || [];
        
        const customers = new Set();
        const regions = new Set();
        const locations = new Set();
        const models = new Set();
        const types = new Set();
        
        for (const m of machines) {
            if (m.customer) customers.add(m.customer);
            if (m.region) regions.add(m.region);
            if (m.location) locations.add(m.location);
            if (m.model) models.add(m.model);
            if (m.type) types.add(m.type);
        }
        
        console.log(Extracted  Customers,  Regions,  Locations,  Models,  Types.);
        
        // Helper to insert sets
        async function insertSet(tableName, setObj, extraFields = {}) {
            let count = 0;
            for (const name of setObj) {
                const payload = { name: name, ...extraFields };
                const ins = await window.electron.invoke('supabase:query', {
                    table: tableName, method: 'upsert', data: payload
                });
                if (!ins.error) count++;
            }
            console.log(Migrated  records to .);
        }
        
        await insertSet('ft_customer', customers, { customer_name: '' });
        await insertSet('ft_region', regions, { region_name: '' });
        await insertSet('ft_location', locations, { location: '' });
        await insertSet('ft_machine_model', models, { model_name: '' });
        await insertSet('ft_machine_type', types, { type_name: '' });

        // 2. Mine BD Categories
        console.log("Fetching BD Categories...");
        try {
            const bdCatRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_breakdown_categories", {}, "GET");
            const bdCats = bdCatRes.message || [];
            let count = 0;
            for (const c of bdCats) {
                const ins = await window.electron.invoke('supabase:query', {
                    table: 'ft_bd_category', method: 'upsert', data: { name: c, category: c }
                });
                if (!ins.error) count++;
            }
            console.log(Migrated  records to ft_bd_category.);
        } catch(e) { console.warn("Could not fetch BD categories", e); }

        // 3. Mine Defect Categories
        console.log("Fetching Defect Summary to extract Defect Categories...");
        try {
            const defRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary", {}, "GET");
            if (defRes.message && defRes.message.categories) {
                let count = 0;
                for (const c of defRes.message.categories) {
                    const ins = await window.electron.invoke('supabase:query', {
                        table: 'ft_defect_category', method: 'upsert', data: { name: c.name || c.category, category: c.category }
                    });
                    if (!ins.error) count++;
                }
                console.log(Migrated  records to ft_defect_category.);
            }
        } catch(e) { console.warn("Could not fetch Defect categories", e); }
        
        alert("Phase 1 Data Mining Migration Complete! Check console for details.");
        
    } catch (e) {
        console.error("Migration script failed:", e);
        alert("Migration failed. Check console.");
    }
};
'''

with codecs.open('js/migrate_phase1.js', 'w', 'utf-8') as f:
    f.write(js_content)

print("Updated migrate_phase1.js with Data Mining approach")
