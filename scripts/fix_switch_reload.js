const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const switchScriptOld = `    if (typeof loadDailyBreakdownReport === 'function') loadDailyBreakdownReport();
    if (typeof loadFtCustomers === 'function') loadFtCustomers();
    if (typeof loadFtMachineRegister === 'function') loadFtMachineRegister();
  };`;
const switchScriptNew = `    if (typeof loadDailyBreakdownReport === 'function') loadDailyBreakdownReport();
    if (typeof loadFtCustomers === 'function') loadFtCustomers();
    if (typeof loadFtMachineRegister === 'function') loadFtMachineRegister();
    if (typeof filterDefectsTable === 'function') {
        try { filterDefectsTable(); } catch(e){}
    }
    if (typeof loadFieldServicePlan === 'function') {
        try { loadFieldServicePlan(); } catch(e){}
    }
  };`;
html = html.replace(switchScriptOld, switchScriptNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Added defect and STS refresh to switchDivision');
