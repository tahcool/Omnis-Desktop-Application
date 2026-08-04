const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// Fix dropdown value
html = html.replace('<option value="powerstar" style="color: #0f172a;">Sinopower</option>', '<option value="sinopower" style="color: #0f172a;">Sinopower</option>');

// Fix references in switchDivision
html = html.replace(/div === 'powerstar'/g, "div === 'sinopower'");

// Fix query to only show open breakdowns
html = html.replace(
  "let query = supabase.from('ft_breakdown_logs').select('*').eq('division', currentDiv);",
  "let query = supabase.from('ft_breakdown_logs').select('*').eq('division', currentDiv).or('breakdown_end_date.is.null');"
);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Patches applied successfully.");
