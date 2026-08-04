const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const navOld = `      <div class="top-nav-group" style="position:absolute; right:28px; top:50%; transform:translateY(-50%); gap:6px; flex-shrink:0;">

        <!-- Settings dropdown -->`;
const navNew = `      <div class="top-nav-group" style="position:absolute; right:28px; top:50%; transform:translateY(-50%); gap:6px; flex-shrink:0;">
        <!-- Division Toggle -->
        <select id="division-toggle" onchange="window.switchDivision(this.value)" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 600; outline: none; cursor: pointer; margin-right: 10px;">
          <option value="fleetrack" style="color: #0f172a;">Fleetrack</option>
          <option value="powerstar" style="color: #0f172a;">Powerstar (Trucks)</option>
        </select>

        <!-- Settings dropdown -->`;

if(html.includes(navOld)) {
  html = html.replace(navOld, navNew);
  
  // Also add the logic for window.switchDivision
  const scriptLocation = `  </script>\n</body>\n</html>`;
  const divisionScript = `
    window.currentDivision = 'fleetrack';
    window.switchDivision = function(div) {
      window.currentDivision = div;
      
      // Update terminology across the app
      const termMachine = div === 'powerstar' ? 'Truck' : 'Machine';
      const termMachines = div === 'powerstar' ? 'Trucks' : 'Machines';
      const termHMR = div === 'powerstar' ? 'Mileage' : 'HMR';
      
      document.querySelectorAll('.term-machine').forEach(el => el.textContent = termMachine);
      document.querySelectorAll('.term-machines').forEach(el => el.textContent = termMachines);
      document.querySelectorAll('.term-hmr').forEach(el => el.textContent = termHMR);
      
      // Reload current view
      if (typeof loadDailyBreakdownReport === 'function') loadDailyBreakdownReport();
      if (typeof loadFtCustomers === 'function') loadFtCustomers();
      if (typeof loadFtMachineRegister === 'function') loadFtMachineRegister();
    };
  </script>
</body>
</html>`;
  html = html.replace(scriptLocation, divisionScript);

  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Division toggle added.");
} else {
  console.log("Could not find nav replacement point.");
}
