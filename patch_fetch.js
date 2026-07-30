const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const regex = /async function fetchTechnicians\(\) \{[\s\S]*?return techs;\s*\}\s*catch\s*\(e\)\s*\{\s*console\.warn\('fspTechSearch load error:', e\);\s*return \[\];\s*\}\s*\}/;

const newFetch = `async function fetchTechnicians() {
      if (FT_TECH_CACHE.data && (Date.now() - FT_TECH_CACHE.ts < 300000)) {
        return FT_TECH_CACHE.data;
      }
      try {
        const res = await supaQuery('ft_technicians', 'select', { filters: { status: 'eq.Active' } });
        const techs = Array.isArray(res) ? res : [];
        FT_TECH_CACHE.data = techs;
        FT_TECH_CACHE.ts = Date.now();
        return techs;
      } catch (e) {
        console.warn('fetchTechnicians load error:', e);
        return [];
      }
    }`;

if (regex.test(html)) {
  html = html.replace(regex, newFetch);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Patched fetchTechnicians via regex!");
} else {
  console.log("Regex failed. Attempting indexOf replacement...");
  const startStr = 'async function fetchTechnicians() {';
  const startIdx = html.indexOf(startStr);
  if (startIdx > -1) {
     let endIdx = html.indexOf('catch (e)', startIdx);
     if (endIdx > -1) {
         endIdx = html.indexOf('}', html.indexOf('}', endIdx) + 1);
         if (endIdx > -1) {
             const before = html.substring(0, startIdx);
             const after = html.substring(endIdx + 1);
             fs.writeFileSync('systems/fleetrack/index.html', before + newFetch + after);
             console.log("Patched via indexOf!");
         } else {
             console.log("Could not find end of catch block.");
         }
     } else {
         console.log("Could not find catch block.");
     }
  } else {
      console.log("Could not find startStr.");
  }
}
