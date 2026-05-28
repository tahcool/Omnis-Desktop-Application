window.getDBRData = async function(filters) {
    if (!window.electron || !window.electron.invoke) {
        throw new Error("Electron IPC not found. Supabase bridge unavailable.");
    }
    
    // 1. Fetch Breakdown Logs
    const bdResponse = await window.electron.invoke('supabase:query', {
        table: 'ft_breakdown_log',
        method: 'select',
        params: { columns: '*' }
    });
    
    if (bdResponse.error) { const errMsg = typeof bdResponse.error === "string" ? bdResponse.error : (bdResponse.error.message || JSON.stringify(bdResponse.error)); throw new Error(errMsg); }
    let breakdowns = bdResponse.data || [];
    
    // Filter active breakdowns (end_date IS NULL)
    breakdowns = breakdowns.filter(bd => !bd.end_date);
    
    // 2. Fetch Machines for the joined data
    const machineIds = [...new Set(breakdowns.map(bd => bd.machine))];
    let machines = [];
    if (machineIds.length > 0) {
        const maResponse = await window.electron.invoke('supabase:query', {
            table: 'ft_machine',
            method: 'select',
            params: { columns: '*' }
        });
        if (maResponse.error) { const errMsg = typeof maResponse.error === "string" ? maResponse.error : (maResponse.error.message || JSON.stringify(maResponse.error)); throw new Error(errMsg); }
        machines = maResponse.data || [];
    }
    
    const machineMap = {};
    machines.forEach(ma => {
        machineMap[ma.name] = ma;
    });
    
    // 3. Map and format data
    const formattedData = [];
    let tedCount = 0;
    let tedValidCount = 0;
    
    for (const bd of breakdowns) {
        const ma = machineMap[bd.machine] || {};
        
        // Filter by region if provided
        if (filters && filters.region && ma.region !== filters.region) {
            continue;
        }
        
        const formatDate = (dateString) => {
            if (!dateString) return null;
            const d = new Date(dateString);
            return d.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' });
        };
        
        const daysOnBd = bd.breakdown_date ? Math.floor((new Date() - new Date(bd.breakdown_date)) / (1000 * 60 * 60 * 24)) : 0;
        
        const row = {
            "Customer": bd.customer,
            "Model": bd.model,
            "SN": bd.machine,
            "HMR": ma.current_hmr,
            "Region": ma.region,
            "Date": formatDate(bd.breakdown_date),
            "Description": bd.description,
            "Status": bd.status,
            "Days on BD": daysOnBd,
            "Parts ETA": formatDate(bd.parts_eta),
            "Warranty Status": bd.warranty_status,
            "On Hold": bd.on_hold ? 1 : 0,
            "Ted Status": bd.ted_status,
            "Ted": formatDate(bd.ted),
            "Red": formatDate(bd.red),
            "Machine Running?": bd.is_the_machine_still_running || "No"
        };
        
        if (bd.ted) {
            tedCount++;
            if (new Date(bd.ted) > new Date()) {
                tedValidCount++;
            }
        }
        
        formattedData.push(row);
    }
    
    // Sort by breakdown date descending
    formattedData.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    
    // Calculate Efficiency
    let efficiency = "100.0%";
    if (tedCount > 0) {
        efficiency = ((tedValidCount / tedCount) * 100).toFixed(1) + "%";
    }
    
    // Inject efficiency into the first row or as a separate return (Frappe DBR HTML uses data[0]["efficiency"])
    if (formattedData.length > 0) {
        formattedData[0]["efficiency"] = efficiency;
    } else {
        formattedData.push({ "efficiency": efficiency, Customer: "No records found." });
    }
    
    return formattedData;
};
