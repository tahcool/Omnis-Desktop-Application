const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const waFiltersOld = `      const filters = {
        region: document.getElementById("dbr-filter-region").value,
        customer: document.getElementById("dbr-filter-customer").value,
        machine: document.getElementById("dbr-filter-machine").value,
        responsibility: document.getElementById("dbr-filter-responsibility").value,
        urgent: document.getElementById("dbr-filter-urgent").checked ? 1 : 0
      };`;
const waFiltersNew = `      const filters = {
        region: document.getElementById("dbr-filter-region").value,
        customer: document.getElementById("dbr-filter-customer").value,
        machine: document.getElementById("dbr-filter-machine").value,
        responsibility: document.getElementById("dbr-filter-responsibility").value,
        ifn: document.getElementById("dbr-filter-ifn")?.value || '',
        cfn: document.getElementById("dbr-filter-cfn")?.value || '',
        urgent: document.getElementById("dbr-filter-urgent").checked ? 1 : 0
      };`;
html = html.replace(waFiltersOld, waFiltersNew);

const loadFiltersOld = `        const filters = {
          region: document.getElementById('dbr-filter-region')?.value || '',
          customer: document.getElementById('dbr-filter-customer')?.value || '',
          machine: document.getElementById('dbr-filter-machine')?.value || '',
          responsibility: document.getElementById('dbr-filter-responsibility')?.value || '',
          urgent: document.getElementById('dbr-filter-urgent')?.checked ? 1 : 0,
          _ts: Date.now() // Force fresh fetch to bypass browser cache
        };
        // Supabase fetch
        let query = supabase.from('ft_breakdown_logs').select('*');
        if (filters.region) query = query.ilike('region', \`%\${filters.region}%\`);
        if (filters.customer) query = query.ilike('customer', \`%\${filters.customer}%\`);
        if (filters.machine) {
          query = query.or(\`machine.ilike.%\${filters.machine}%,model.ilike.%\${filters.machine}%,serial_number.ilike.%\${filters.machine}%,fleet_no.ilike.%\${filters.machine}%\`);
        }
        if (filters.responsibility) query = query.ilike('responsibility', \`%\${filters.responsibility}%\`);
        if (filters.urgent) query = query.eq('urgent', true);`;

const loadFiltersNew = `        const filters = {
          region: document.getElementById('dbr-filter-region')?.value || '',
          customer: document.getElementById('dbr-filter-customer')?.value || '',
          machine: document.getElementById('dbr-filter-machine')?.value || '',
          responsibility: document.getElementById('dbr-filter-responsibility')?.value || '',
          ifn: document.getElementById('dbr-filter-ifn')?.value || '',
          cfn: document.getElementById('dbr-filter-cfn')?.value || '',
          urgent: document.getElementById('dbr-filter-urgent')?.checked ? 1 : 0,
          _ts: Date.now() // Force fresh fetch to bypass browser cache
        };
        // Supabase fetch
        let query = supabase.from('ft_breakdown_logs').select('*');
        if (filters.region) query = query.ilike('region', \`%\${filters.region}%\`);
        if (filters.customer) query = query.ilike('customer', \`%\${filters.customer}%\`);
        if (filters.ifn) query = query.ilike('fleet_no', \`%\${filters.ifn}%\`);
        if (filters.cfn) query = query.ilike('customer_ref', \`%\${filters.cfn}%\`);
        if (filters.machine) {
          query = query.or(\`machine.ilike.%\${filters.machine}%,model.ilike.%\${filters.machine}%,serial_number.ilike.%\${filters.machine}%,fleet_no.ilike.%\${filters.machine}%\`);
        }
        if (filters.responsibility) query = query.ilike('responsibility', \`%\${filters.responsibility}%\`);
        if (filters.urgent) query = query.eq('urgent', true);`;
        
html = html.replace(loadFiltersOld, loadFiltersNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Updated loadDailyBreakdownReport logic for IFN/CFN");
