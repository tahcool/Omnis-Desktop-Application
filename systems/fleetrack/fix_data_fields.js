const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Fix 1: loadCustomersView - wrong field name for machine data (rows → data)
const oldCustFallback = `      const res = await callFrappe(
          "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register", {}
        );
        machines = res?.message?.rows || res?.rows || [];
        window.FT_MACHINE_ROWS = machines;`;

const newCustFallback = `      const res = await callFrappe(
          "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register", {}
        );
        machines = res?.message?.data || res?.data || [];
        window.FT_MACHINE_ROWS = machines;`;

console.log('Fix1 found:', c.includes(oldCustFallback));
c = c.replace(oldCustFallback, newCustFallback);

// Fix 2: loadServiceDueView - same wrong field name
const oldSvcFallback = `SD_ALL_ROWS = (res?.message?.rows || res?.rows || []);`;
const newSvcFallback = `SD_ALL_ROWS = (res?.message?.data || res?.data || []);`;
console.log('Fix2 found:', c.includes(oldSvcFallback));
c = c.replace(oldSvcFallback, newSvcFallback);

// Fix 3: renderServiceDue filter is too strict - remove fleetrack_managed and working_status filters
// since many machines may not have these fields set
const oldFilter = `    let rows = SD_ALL_ROWS.filter(r => {
      if (r.fleetrack_managed === "No") return false;
      if (r.working_status === "Inactive" || r.working_status === "Sold") return false;
      return true;
    });`;
const newFilter = `    let rows = SD_ALL_ROWS.filter(r => {
      // Include all machines that have HMR data; exclude obviously inactive ones
      if (r.working_status === "Sold") return false;
      return true;
    });`;
console.log('Fix3 found:', c.includes(oldFilter));
c = c.replace(oldFilter, newFilter);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('All done');
