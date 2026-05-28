import codecs

with codecs.open('js/migrate_data.js', 'w', 'utf-8') as f:
    f.write('''
window.runFrappeToSupabaseMigration = async function() {
    try {
        console.log("Starting Migration via Custom Endpoints...");
        
        // 1. Migrate Machines
        console.log("Fetching FT Machines from Frappe...");
        const machinesRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register", {}, "GET");
        const machines = machinesRes.message || [];
        console.log(Found  machines. Inserting to Supabase...);
        
        let machineInserts = 0;
        for (const m of machines) {
            const payload = {
                name: m.name,
                customer: m.customer || null,
                model: m.model || null,
                region: m.region || null,
                current_hmr: m.current_hmr || 0,
            };
            const ins = await window.electron.invoke('supabase:query', {
                table: 'ft_machine', method: 'upsert', data: payload
            });
            if (ins.error) console.error("Machine insert error:", ins.error);
            else machineInserts++;
        }
        console.log(Migrated  machines.);

        // 2. Migrate Open Breakdowns
        console.log("Fetching FT Breakdown Logs from Frappe...");
        const bdRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_breakdown_dbr_v2", {}, "GET");
        const breakdowns = (bdRes.message && bdRes.message.breakdowns) ? bdRes.message.breakdowns : [];
        console.log(Found  breakdowns. Inserting to Supabase...);
        
        let bdInserts = 0;
        for (const bd of breakdowns) {
            const payload = {
                name: bd.name,
                machine: bd.machine,
                customer: bd.customer || null,
                model: bd.model || null,
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
                supervisor_approved: bd.supervisor_approved || 0
            };
            const ins = await window.electron.invoke('supabase:query', {
                table: 'ft_breakdown_log', method: 'upsert', data: payload
            });
            if (ins.error) console.error("Breakdown insert error:", ins.error);
            else bdInserts++;
        }
        console.log(Migrated  breakdowns.);
        
        alert(Migration Complete! Migrated  machines and  open breakdowns.);
        
    } catch (e) {
        console.error("Migration failed:", e);
        alert("Migration failed. Check console.");
    }
};
''')

print("Created migrate_data.js using custom endpoints to avoid 403")
