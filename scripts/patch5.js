const fs = require('fs');

let jsPath = 'systems/salestrack/orders_logic.js';
let content = fs.readFileSync(jsPath, 'utf8');

// The block to replace
const oldLoopStart = "for (let d of defects) {";
const oldLoopEnd = "html += `</tbody></table></div></div>`;";

// Extract the exact block of the old loop
let startIndex = content.indexOf(oldLoopStart);
let endIndex = content.indexOf(oldLoopEnd, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find loop to replace!");
    process.exit(1);
}

let newLoop = `
    // Group defects by customer + machine
    let grouped = {};
    for (let d of defects) {
        let customer = d.customer || d.order_id || 'Unknown';
        let machine = d.machine || '-';
        let key = customer + '|||' + machine;
        if (!grouped[key]) {
            grouped[key] = { customer: customer, machine: machine, defects: [] };
        }
        grouped[key].defects.push(d);
    }

    for (let key in grouped) {
        let group = grouped[key];
        
        let defectsHtml = group.defects.map(d => {
            let desc = (d.description || d.name || 'No Description').trim().replace(/\\n/g, '<br>');
            let date = d.start_date || (d.created_at ? d.created_at.substring(0, 10) : '-');
            return \`
                <div style="background:#fef2f2; padding:8px 12px; border-radius:6px; border:1px solid #fecaca; margin-bottom:6px; display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
                    <div style="flex:1;">\${desc}</div>
                    <div style="font-size:11px; color:#991b1b; font-weight:700; white-space:nowrap; background:#fee2e2; padding:2px 6px; border-radius:4px;">\${date}</div>
                </div>
            \`;
        }).join('');

        html += \`
            <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding:16px; font-weight:700; color:#334155; vertical-align:top;">\${group.customer}</td>
                <td style="padding:16px; font-weight:600; color:#0f172a; vertical-align:top;">\${group.machine}</td>
                <td style="padding:16px; color:#991b1b; font-weight:500; vertical-align:top;" colspan="2">
                    \${defectsHtml}
                </td>
            </tr>
        \`;
    }

    `;

let newContent = content.substring(0, startIndex) + newLoop + content.substring(endIndex);

// Wait, we need to adjust the table header! The "Date Logged" column should probably be removed since dates are now IN the defect blocks!
// Let's replace the header too.
newContent = newContent.replace(
    `<th style="padding:16px; border-bottom:1px solid #e2e8f0;">Defect Description</th>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:15%;">Date Logged</th>`,
    `<th style="padding:16px; border-bottom:1px solid #e2e8f0;" colspan="2">Defects & Dates Logged</th>`
);

fs.writeFileSync(jsPath, newContent);
console.log('Grouped defects loop applied');
