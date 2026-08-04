const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// The incorrect block that replaced the leaflet closing script tag
const incorrectBlock = `  window.currentDivision = 'fleetrack';
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

if (html.includes(incorrectBlock)) {
  // Revert the first occurrence
  html = html.replace(incorrectBlock, '</script>');
}

// Now append it safely to the very end before </body></html>
const correctBlock = `
<script>
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
</script>
</body></html>`;

html = html.replace('</body></html>', correctBlock);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Fixed switchDivision script location.');
