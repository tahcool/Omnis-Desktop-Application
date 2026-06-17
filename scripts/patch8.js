const fs = require('fs');

let jsPath = 'systems/salestrack/orders_logic.js';
let content = fs.readFileSync(jsPath, 'utf8');

const targetBlock = `        btnHtml += \`
            <div style="margin-top:6px; display:flex; align-items:center; gap:5px;">
              <select
                style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:7px; border:1px solid \${cc.border}; background:\${cc.bg}; color:\${cc.color}; cursor:pointer; outline:none; width:100%;"
                onchange="window.setOrderCompany('\${safeReportId}', this.value, this)"
              >
                <option value="Sinopower"          \${r.company === 'Sinopower'          ? 'selected' : ''}>SPZ</option>
                <option value="Machinery Exchange" \${r.company === 'Machinery Exchange' ? 'selected' : ''}>MXG</option>
                <option value="Unassigned"         \${(!r.company || r.company === 'Unassigned') ? 'selected' : ''}>---</option>
              </select>
              <span id="company-status-\${r.report_id}" style="font-size:10px; color:#94a3b8; white-space:nowrap;"></span>
            </div>\`;`;

const replacementBlock = `        const omnisUser = (localStorage.getItem("omnisUser") || "").toLowerCase();
        const isAdmin = omnisUser === "administrator" || omnisUser === "admin" || omnisUser.includes("admin");

        if (isAdmin) {
            btnHtml += \`
                <div style="margin-top:6px; display:flex; align-items:center; justify-content:flex-end; gap:5px;">
                  <select
                    style="font-size:10px; font-weight:700; padding:2px; border:none; background:transparent; color:#94a3b8; cursor:pointer; outline:none; text-align:right;"
                    onchange="window.setOrderCompany('\${safeReportId}', this.value, this)"
                  >
                    <option value="Sinopower"          \${r.company === 'Sinopower'          ? 'selected' : ''}>SPZ</option>
                    <option value="Machinery Exchange" \${r.company === 'Machinery Exchange' ? 'selected' : ''}>MXG</option>
                    <option value="Unassigned"         \${(!r.company || r.company === 'Unassigned') ? 'selected' : ''}>---</option>
                  </select>
                  <span id="company-status-\${r.report_id}" style="font-size:10px; color:#94a3b8; white-space:nowrap;"></span>
                </div>\`;
        } else {
            const displayCode = r.company === 'Sinopower' ? 'SPZ' : (r.company === 'Machinery Exchange' ? 'MXG' : '---');
            btnHtml += \`
                <div style="margin-top:6px; font-size:10px; font-weight:600; color:#cbd5e1; text-align:right;">
                  \${displayCode}
                </div>\`;
        }`;

content = content.replace(targetBlock, replacementBlock);

// Also we need to make sure the setOrderCompany doesn't reset the colors back to the vivid ones on success!
const colorResetBlock = `            if (selectEl) {
                selectEl.style.background = cc.bg;
                selectEl.style.color = cc.color;
                selectEl.style.borderColor = cc.border;
            }`;

const newColorResetBlock = `            if (selectEl) {
                // Subtle style maintained
                selectEl.style.background = 'transparent';
                selectEl.style.color = '#94a3b8';
                selectEl.style.borderColor = 'transparent';
            }`;

content = content.replace(colorResetBlock, newColorResetBlock);

fs.writeFileSync(jsPath, content);
console.log('Made company select subtle and admin-only');
