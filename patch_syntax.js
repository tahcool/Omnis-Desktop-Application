const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Remove duplicate declaration
const duplicateTarget = `    // --- TECHNICIANS LOGIC ---\n    let FT_TECH_CACHE = { data: null, ts: 0 };`;
const duplicateFix = `    // --- TECHNICIANS LOGIC ---`;
if (html.includes(duplicateTarget)) {
    html = html.replace(duplicateTarget, duplicateFix);
}

// 2. Fix fetchTechnicians logic to handle Supabase response correctly
const fetchTargetRegex = /async function fetchTechnicians\(\) \{[\s\S]*?return \[\];\s*\}\s*\}/;
const fetchFix = `async function fetchTechnicians() {
      if (FT_TECH_CACHE.data && (Date.now() - FT_TECH_CACHE.ts < 300000)) {
        return FT_TECH_CACHE.data;
      }
      try {
        const res = await supaQuery('ft_technicians', 'select', { filters: { status: 'eq.Active' } });
        const techs = (res && res.data && Array.isArray(res.data)) ? res.data : [];
        FT_TECH_CACHE.data = techs;
        FT_TECH_CACHE.ts = Date.now();
        return techs;
      } catch (e) {
        console.warn('fetchTechnicians load error:', e);
        return [];
      }
    }`;

if (fetchTargetRegex.test(html)) {
    html = html.replace(fetchTargetRegex, fetchFix);
} else {
    console.log("Could not find fetchTechnicians to replace!");
}

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Syntax error and fetch logic fixed!");
