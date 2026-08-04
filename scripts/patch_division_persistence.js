const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `  window.currentDivision = 'fleetrack';
  window.switchDivision = function(div) {
  window.currentDivision = div;`;

const replaceStr = `  window.currentDivision = localStorage.getItem('omnis_active_division') || 'fleetrack';
  
  document.addEventListener('DOMContentLoaded', () => {
    const dt = document.getElementById('division-toggle');
    if (dt) dt.value = window.currentDivision;
    
    // Update text labels
    const termMachine = window.currentDivision === 'sinopower' ? 'Truck' : 'Machine';
    const termMachines = window.currentDivision === 'sinopower' ? 'Trucks' : 'Machines';
    const termHMR = window.currentDivision === 'sinopower' ? 'Mileage' : 'HMR';
    
    document.querySelectorAll('.term-machine').forEach(el => el.textContent = termMachine);
    document.querySelectorAll('.term-machines').forEach(el => el.textContent = termMachines);
    document.querySelectorAll('.term-hmr').forEach(el => el.textContent = termHMR);
  });

  window.switchDivision = function(div) {
  localStorage.setItem('omnis_active_division', div);
  window.currentDivision = div;`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Persistence patched successfully!");
} else {
  // Try normalized search
  let normalizedContent = content.replace(/\r\n/g, '\n');
  if (normalizedContent.includes(searchStr)) {
      normalizedContent = normalizedContent.replace(searchStr, replaceStr);
      fs.writeFileSync(path, normalizedContent, 'utf8');
      console.log("Persistence patched successfully (normalized)!");
  } else {
      console.log("Could not find the target string.");
  }
}
