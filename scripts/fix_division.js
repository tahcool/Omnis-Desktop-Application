const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const divScript = `
  window.currentDivision = 'fleetrack';
  window.switchDivision = function(div) {
    window.currentDivision = div;
    const termMachine = div === 'powerstar' ? 'Truck' : 'Machine';
    const termMachines = div === 'powerstar' ? 'Trucks' : 'Machines';
    const termHMR = div === 'powerstar' ? 'Mileage' : 'HMR';
    document.querySelectorAll('.term-machine').forEach(el => el.textContent = termMachine);
    document.querySelectorAll('.term-machines').forEach(el => el.textContent = termMachines);
    document.querySelectorAll('.term-hmr').forEach(el => el.textContent = termHMR);
    if (typeof loadDailyBreakdownReport === 'function') loadDailyBreakdownReport();
    if (typeof loadFtCustomers === 'function') loadFtCustomers();
    if (typeof loadFtMachineRegister === 'function') loadFtMachineRegister();
  };
</script>`;

html = html.replace('</script>', divScript);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Fixed switchDivision function injection.');
