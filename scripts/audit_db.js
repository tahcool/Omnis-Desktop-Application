const fs = require('fs');
const content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const frappeMethodCount = (content.match(/\/api\/method\//g) || []).length;
const callFrappeCount = (content.match(/callFrappe/g) || []).length;
const supabaseCount = (content.match(/supabase/g) || []).length;
const postgrestCount = (content.match(/\.from\(/g) || []).length;

console.log('Frappe method routes:', frappeMethodCount);
console.log('callFrappe usages:', callFrappeCount);
console.log('Supabase references:', supabaseCount);
console.log('Supabase .from() queries:', postgrestCount);

const frappeApis = new Set(content.match(/\/api\/method\/mxg_fleet_track[a-zA-Z0-9_\.]+/g) || []);
console.log('\nUnique Frappe endpoints still in use:');
frappeApis.forEach(api => console.log(api));
