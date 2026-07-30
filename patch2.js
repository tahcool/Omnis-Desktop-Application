const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const startStr = 'async function fspTechSearch(q, hiddenId, dropId) {';
const endStr = 'drop.appendChild(li);\n      });\n    }';

const startIdx = html.indexOf(startStr);
if (startIdx === -1) {
    console.log("Could not find start");
    process.exit(1);
}

const endIdx = html.indexOf(endStr, startIdx);
if (endIdx === -1) {
    console.log("Could not find end");
    process.exit(1);
}

const before = html.substring(0, startIdx);
const after = html.substring(endIdx + endStr.length);

const newFunc = `async function fspTechSearch(q, hiddenId, dropId) {
      const drop = document.getElementById(dropId);
      const hidden = document.getElementById(hiddenId);
      if (!drop) return;

      const techs = await fetchTechnicians();
      const ql = (q || '').toLowerCase().trim();

      const matches = ql
        ? techs.filter(t =>
            (t.full_name || t.frappe_name || t.name || '').toLowerCase().includes(ql) ||
            (t.mobile_phone || t.mobile_no || '').toLowerCase().includes(ql)
          )
        : techs.slice(0, 15);

      drop.innerHTML = '';
      drop.style.display = 'block';

      if (matches.length === 0) {
        drop.innerHTML = \`
          <li style="padding:12px; color:#64748b; font-size:13px; text-align:center;">
            No technicians found.
          </li>
          <li style="padding:8px;">
            <button onmousedown="event.preventDefault(); openAddTechnicianModal('\${q.replace(/'/g, "\\\\'")}')" style="width:100%; padding:10px; background:#eff6ff; color:#2563eb; border:1px dashed #bfdbfe; border-radius:6px; font-weight:700; cursor:pointer;">
              + Add "\${q}"
            </button>
          </li>
        \`;
        return;
      }

      matches.forEach(t => {
        const li = document.createElement('li');
        const name = t.full_name || t.frappe_name || t.name;
        li.style.cssText = 'padding:10px 14px; cursor:pointer; font-size:13px; border-bottom:1px solid #f1f5f9; display:flex; flex-direction:column; transition:background 0.2s;';
        li.innerHTML = \`<span style="font-weight:700; color:#1e293b;">\${name}</span>\`
                     + (t.designation ? \`<span style="font-size:11px; color:#64748b; margin-top:2px;">\${t.designation} \${t.site ? '· ' + t.site : ''}</span>\` : '');
        li.onmouseenter = () => li.style.background = '#f8fafc';
        li.onmouseleave = () => li.style.background = '';
        li.onmousedown  = (e) => {
          e.preventDefault();
          const searchInput = document.getElementById(hiddenId.replace('hidden', 'search')) || document.getElementById(hiddenId + '-search');
          if (searchInput) searchInput.value = name;
          hidden.value = name;
          drop.style.display = 'none';
        };
        drop.appendChild(li);
      });
    }`;

fs.writeFileSync('systems/fleetrack/index.html', before + newFunc + after);
console.log("Replaced successfully!");
