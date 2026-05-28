import codecs

with codecs.open('js/migrate_data.js', 'w', 'utf-8') as f:
    f.write('''
window.runFrappeToSupabaseMigration = async function() {
    try {
        console.log("Starting Migration...");
        
        // 1. Migrate Machines
        console.log("Fetching FT Machines from Frappe...");
        const machinesRes = await callFrappe("/api/resource/FT Machine?limit_page_length=99999&fields=[\"*\"]", {}, "GET");
        const machines = machinesRes.data || [];
        console.log(Found  machines. Inserting to Supabase...);
        
        let machineInserts = 0;
        for (const m of machines) {
            const payload = {
                name: m.name,
                customer: m.customer,
                model: m.model,
                region: m.region,
                current_hmr: m.current_hmr || 0,
                created_at: m.creation,
                updated_at: m.modified
            };
            const ins = await window.electron.invoke('supabase:query', {
                table: 'ft_machine', method: 'upsert', data: payload
            });
            if (ins.error) console.error("Machine insert error:", ins.error);
            else machineInserts++;
        }
        console.log(Migrated  machines.);

        // 2. Migrate Breakdown Logs
        console.log("Fetching FT Breakdown Logs from Frappe...");
        const bdRes = await callFrappe("/api/resource/FT Breakdown Log?limit_page_length=99999&fields=[\"*\"]", {}, "GET");
        const breakdowns = bdRes.data || [];
        console.log(Found  breakdowns. Inserting to Supabase...);
        
        let bdInserts = 0;
        for (const bd of breakdowns) {
            const payload = {
                name: bd.name,
                machine: bd.machine,
                customer: bd.customer,
                model: bd.model,
                breakdown_date: bd.breakdown_date || null,
                end_date: bd.end_date || null,
                description: bd.description || "",
                status: bd.status || "",
                parts_eta: bd.parts_eta || null,
                warranty_status: bd.warranty_status || "",
                on_hold: bd.on_hold === 1,
                ted_status: bd.ted_status || "",
                ted: bd.ted || null,
                red: bd.red || null,
                is_the_machine_still_running: bd.is_the_machine_still_running || "",
                quote_date: bd.quote_date || null,
                resp: bd.resp || "",
                category: bd.category || "",
                out_eta: bd.out_eta || null,
                urgent: bd.urgent === 1,
                supervisor_comment: bd.supervisor_comment || "",
                supervisor_approved: bd.supervisor_approved || 0,
                created_at: bd.creation,
                updated_at: bd.modified
            };
            const ins = await window.electron.invoke('supabase:query', {
                table: 'ft_breakdown_log', method: 'upsert', data: payload
            });
            if (ins.error) console.error("Breakdown insert error:", ins.error);
            else bdInserts++;
        }
        console.log(Migrated  breakdowns.);
        
        alert(Migration Complete! Migrated  machines and  breakdowns.);
        
    } catch (e) {
        console.error("Migration failed:", e);
        alert("Migration failed. Check console.");
    }
};
''')

print("Created migrate_data.js")
