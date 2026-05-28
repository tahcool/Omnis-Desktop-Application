window.runPhase2Migration = async function() {
    try {
        console.log("Starting Phase 2 Core Operations Migration (Data Mining Mode)...");
        console.log("Attempting to fetch ALL FT Breakdown Logs via standard REST API...");
        
        const dbrRes = await callFrappe("/api/resource/FT Breakdown Log?limit_page_length=99999&fields=[\"*\"]", {}, "GET");
        
        let breakdowns = [];
        if (dbrRes.data && Array.isArray(dbrRes.data)) {
            breakdowns = dbrRes.data;
        } else if (dbrRes.message && Array.isArray(dbrRes.message)) {
            breakdowns = dbrRes.message;
        } else if (dbrRes.message && dbrRes.message.data && Array.isArray(dbrRes.message.data)) {
            breakdowns = dbrRes.message.data;
        }
        
        if (!breakdowns || breakdowns.length === 0) {
            console.error("No breakdowns found or API returned an error:", dbrRes);
            return;
        }
        
        console.log(`Found ${breakdowns.length} Breakdowns. Inserting...`);
        let bdCount = 0;
        for (const rec of breakdowns) {
            const payload = { ...rec };
            
            // Clean payload using strict schema
            const valid_cols = ['name', 'machine', 'column_break_2', 'oem', 'customer', 'breakdown_date', 'location', 'breakdown_details_section', 'column_break_8', 'description', 'status', 'days_on_bd', 'end_date', 'model', 'fleetrack_managed', 'warranty_status', 'parts_eta', 'ted', 'red', 'fsb', 'resp', 'section_break_19', 'last_col_br_oeta', 'section_break_17', 'dobd_col_br', 'oeta_col_br', 'out_eta', 'section_break_27', 'on_hold', 'ted_status', 'bd_duration', 'category', 'created_at', 'updated_at'];
            if (payload.modified) payload.updated_at = payload.modified;
            const keys = Object.keys(payload);
            for (const k of keys) {
                if (!valid_cols.includes(k)) delete payload[k];
            }
            
            const ins = await window.electron.invoke('supabase:query', {
                table: 'ft_breakdown_log', method: 'upsert', data: payload
            });
            if (ins.error) {
                console.error(`Insert error for breakdown ${rec.name}:`, ins.error);
            } else {
                bdCount++;
            }
        }
        console.log(`Successfully migrated ${bdCount} records to ft_breakdown_log.`);
        
        alert(`Phase 2 Data Mining Migration Complete! Successfully grabbed ${bdCount} historical breakdowns.`);
        
    } catch (e) {
        console.error("Migration script failed:", e);
        alert("Phase 2 Migration failed. Check console.");
    }
};
