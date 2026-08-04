const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const badBlock1 = `
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
</body></html>\`);`;

const badBlock2 = `
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
</body></html>");`;

html = html.replace(badBlock1, '</body></html>`);');
html = html.replace(badBlock2, '</body></html>");');

const scriptStr = `
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

// Ensure we find the real </body></html> at the very end
const lines = html.split('\n');
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('</body></html>')) {
    lines[i] = lines[i].replace('</body></html>', scriptStr);
    break; // only the last one
  }
}
html = lines.join('\n');

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Fixed switchDivision script location again.');
