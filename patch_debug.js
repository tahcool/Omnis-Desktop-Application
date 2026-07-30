const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

html = html.replace('async function loadTechniciansView() {', 'async function loadTechniciansView() { console.log("loadTechniciansView STARTED");');
html = html.replace('async function fetchTechnicians() {', 'async function fetchTechnicians() { console.log("fetchTechnicians STARTED");');
html = html.replace('function renderTechniciansView() {', 'function renderTechniciansView() { console.log("renderTechniciansView STARTED");');
html = html.replace('const res = await supaQuery(\'ft_technicians\', \'select\', { filters: { status: \'eq.Active\' } });', 'console.log("Calling supaQuery..."); const res = await supaQuery(\'ft_technicians\', \'select\', { filters: { status: \'eq.Active\' } }); console.log("supaQuery resolved!", res);');

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log('Added debug logs.');
