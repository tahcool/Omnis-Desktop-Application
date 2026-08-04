const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const targetStr = `const { error: updateError } = await supabase.from('ft_breakdown_logs').update(updateData).or(\`id.eq.\${payload.name},frappe_name.eq.\${payload.name}\`);`;

const replaceStr = `let query = supabase.from('ft_breakdown_logs').update(updateData);
      if (payload.name.includes('-') && payload.name.length > 20) {
        query = query.eq('id', payload.name);
      } else {
        query = query.eq('frappe_name', payload.name);
      }
      const { error: updateError } = await query;`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replaceStr);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Fixed saveDbrEdit UUID issue");
} else {
  console.log("Target string not found!");
}
