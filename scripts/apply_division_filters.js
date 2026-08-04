const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Update loadFtMachineRegister to filter by division
const machineCacheOld = `        window.FT_MACHINE_ROWS = allRows;

        // Populate global map`;
const machineCacheNew = `        const currentDiv = window.currentDivision || 'fleetrack';
        window.FT_MACHINE_ROWS_ALL = allRows;
        window.FT_MACHINE_ROWS = allRows.filter(m => (m.division || 'fleetrack') === currentDiv);

        // Populate global map`;
html = html.replace(machineCacheOld, machineCacheNew);

// 2. Update filterCustomersTable to filter by division
const custFilterOld = `    function filterCustomersTable() {
      const q = document.getElementById("filter-customer-text").value.toLowerCase();
      const tbody = document.getElementById("tbl-customers");`;
const custFilterNew = `    function filterCustomersTable() {
      const q = document.getElementById("filter-customer-text").value.toLowerCase();
      const tbody = document.getElementById("tbl-customers");
      const currentDiv = window.currentDivision || 'fleetrack';`;
html = html.replace(custFilterOld, custFilterNew);

const custFilterLoopOld = `      allFtCustomers.forEach(c => {
        const name = (c.customer_name || "").toLowerCase();
        if (name.includes(q)) {`;
const custFilterLoopNew = `      allFtCustomers.forEach(c => {
        if ((c.division || 'fleetrack') !== currentDiv) return;
        const name = (c.customer_name || "").toLowerCase();
        if (name.includes(q)) {`;
html = html.replace(custFilterLoopOld, custFilterLoopNew);

// 3. Update loadDailyBreakdownReport to query by division
const dbrQueryOld = `        // Supabase fetch
        let query = supabase.from('ft_breakdown_logs').select('*');`;
const dbrQueryNew = `        const currentDiv = window.currentDivision || 'fleetrack';
        // Supabase fetch
        let query = supabase.from('ft_breakdown_logs').select('*').eq('division', currentDiv);`;
html = html.replace(dbrQueryOld, dbrQueryNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Updated index.html to filter by division.");
