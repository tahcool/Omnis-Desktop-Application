const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const target = `    // --- TECHNICIANS LOGIC ---`;
const insert = `    // --- TECHNICIANS LOGIC ---
    let FT_TECH_CACHE = { data: null, ts: 0 };
    async function fetchTechnicians() {
      if (FT_TECH_CACHE.data && (Date.now() - FT_TECH_CACHE.ts) < 300000) {
        return FT_TECH_CACHE.data;
      }
      try {
        const res = await supaQuery('ft_technicians', 'select', { filters: { status: 'eq.Active' } });
        FT_TECH_CACHE.data = Array.isArray(res) ? res : [];
        FT_TECH_CACHE.ts = Date.now();
        return FT_TECH_CACHE.data;
      } catch (e) {
        console.warn('fetchTechnicians load error:', e);
        return [];
      }
    }
`;

if (!html.includes('async function fetchTechnicians()')) {
  html = html.replace(target, insert);
  fs.writeFileSync('systems/fleetrack/index.html', html);
  console.log("Added fetchTechnicians function.");
} else {
  console.log("fetchTechnicians already exists.");
}
