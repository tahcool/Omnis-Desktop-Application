const fs = require('fs');
const path = 'systems/salestrack/dashboard_logic.js';
let js = fs.readFileSync(path, 'utf8');

// Replace the broken initEmailUpdate function entirely
// Find the start and end
const startMarker = '    async initEmailUpdate(reportId) {';
const endMarker   = '\r\n    async sendEmailUpdate(';

const startIdx = js.indexOf(startMarker);
const endIdx   = js.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
    console.log('Could not find function bounds');
    console.log('startIdx:', startIdx, 'endIdx:', endIdx);
    process.exit(1);
}

console.log('Replacing initEmailUpdate from', startIdx, 'to', endIdx);

const newFunction = `    async initEmailUpdate(reportId) {
        const btn = document.getElementById('btn-send-email-update');
        const originalHtml = btn ? btn.innerHTML : '';

        // ── 1. Contacts (To) ──────────────────────────────────────────
        const emailContacts = [];
        document.querySelectorAll('#contacts-tbody tr').forEach(row => {
            const sal   = row.querySelector('input[data-field="salutation"]')?.value.trim() || '';
            const name  = row.querySelector('input[data-field="name1"]')?.value.trim() || '';
            const email = row.querySelector('input[data-field="email_address"]')?.value.trim() || '';
            if (email && email.includes('@')) {
                emailContacts.push({ salutation: sal, name: name || 'Valued Customer', email });
            }
        });

        if (emailContacts.length === 0) {
            this.showToast('No email addresses found in contacts. Please add at least one email.', 'error');
            return;
        }

        const recipientList = emailContacts.map(c =>
            \`\${c.salutation ? c.salutation + ' ' : ''}\${c.name} <\${c.email}>\`
        ).join('<br>');

        const customerName = document.querySelector('#dash-generic-body div[style*="font-size:18px"]')?.textContent.trim()
            || this._currentFullDoc?.customer_name || 'Customer';

        const company = this._currentFullDoc?.company || '';

        // ── 2. CC from Settings (localStorage) ───────────────────────
        const recipients       = this._getRecipients(company);
        const internalTeamLabel = recipients.label;
        const ccList           = recipients.emails;
        const ccListHtml       = ccList.join(', ');

        // ── 3. Machines from DOM inputs ───────────────────────────────
        const machines = [];
        document.querySelectorAll('#machines-tbody tr').forEach(row => {
            if (row.cells.length < 4) return;
            // Name
            const nameInput = row.cells[0]?.querySelector('input');
            const mName     = nameInput?.value.trim() || row.cells[0]?.innerText.trim().split('\\n')[0] || '';
            // Qty
            const qtyInput  = row.cells[1]?.querySelector('input');
            const mQty      = qtyInput?.value.trim() || row.cells[1]?.innerText.trim() || '1';
            // Target date (cell index 2)
            const targetInput  = row.cells[2]?.querySelector('input[type="date"]');
            const mTarget      = targetInput?.value || row.cells[2]?.innerText.trim() || '';
            // Revised date (cell index 3)
            const revisedInput = row.cells[3]?.querySelector('input[type="date"]');
            const mRevised     = revisedInput?.value || row.querySelector('.m-revised')?.value || '';
            // Status (cell index 5 — textarea)
            const statusTA  = row.cells[5]?.querySelector('textarea') || row.querySelector('textarea');
            const mStatus   = statusTA?.value.trim() || '';
            // Image
            const imgEl     = row.querySelector('img.machine-photo, img[data-type="machine"]')
                           || [...(row.querySelectorAll('td img') || [])].find(i => !i.src.includes('placeholder'));
            const mImageUrl = imgEl?.src || '';

            if (mName && mName !== 'Machine / Item') {
                machines.push({ name: mName, qty: mQty, target: mTarget, revised: mRevised, status: mStatus, imageUrl: mImageUrl });
            }
        });

        // ── 4. Preview rows ───────────────────────────────────────────
        const previewRows = machines.map((m, i) => {
            const hasRevised = m.revised && m.revised !== 'dd/mm/yyyy' && m.revised.length > 3;
            const dateCell   = hasRevised
                ? \`<span style="color:#ef4444;font-weight:700;">\${m.revised}</span> <em style="font-size:11px;color:#ef4444;">(Revised)</em>\`
                : (m.target || '—');
            const statusCell = m.status ? \`<td style="padding:8px 12px;font-size:12px;color:#475569;">\${m.status}</td>\` : '';
            return \`<tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#0f172a;">\${i + 1}. \${m.name}</td>
                <td style="padding:8px 12px;font-size:13px;color:#475569;text-align:center;">&times;\${m.qty}</td>
                <td style="padding:8px 12px;font-size:13px;color:#475569;white-space:nowrap;">\${dateCell}</td>
                \${statusCell}
            </tr>\`;
        }).join('');

        const existing = document.getElementById('email-preview-modal');
        if (existing) existing.remove();

        const multiNote = emailContacts.length > 1
            ? \`<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;font-size:12px;color:#1e40af;">&nbsp;&#x2139;&#xFE0F;&nbsp; A formatted report will be sent to the <strong>\${emailContacts.length} recipients</strong> in a single email thread.</div>\`
            : '';

        const machineSection = machines.length > 0 ? \`
        <div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Order Contents</div>
            <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead style="background:#c92222;">
                        <tr>
                            <th style="padding:10px 12px;text-align:left;color:white;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Machine / Item</th>
                            <th style="padding:10px 12px;text-align:center;color:white;font-size:11px;font-weight:700;text-transform:uppercase;">Qty</th>
                            <th style="padding:10px 12px;text-align:left;color:white;font-size:11px;font-weight:700;text-transform:uppercase;">Target Handover</th>
                            <th style="padding:10px 12px;text-align:left;color:white;font-size:11px;font-weight:700;text-transform:uppercase;">Status</th>
                        </tr>
                    </thead>
                    <tbody>\${previewRows}</tbody>
                </table>
            </div>
        </div>\` : '';

        document.body.insertAdjacentHTML('beforeend', \`
        <div id="email-preview-modal" style="
            position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:20000;
            display:flex; align-items:center; justify-content:center;
            backdrop-filter:blur(6px); animation:fadeIn 0.2s ease;
        ">
            <div style="
                background:white; width:90%; max-width:660px; border-radius:16px;
                box-shadow:0 30px 60px rgba(0,0,0,0.3); overflow:hidden;
                animation:slideUp 0.25s cubic-bezier(0.16,1,0.3,1);
                max-height:90vh; display:flex; flex-direction:column;
            ">
                <div style="background:linear-gradient(135deg,#1d4ed8,#1e40af); padding:20px 24px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:40px; height:40px; background:rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px;">&#128231;</div>
                        <div>
                            <div style="font-size:17px; font-weight:700; color:white;">Send Email Update</div>
                            <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:2px;">Equipment Order Status Report</div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('email-preview-modal').remove()" style="background:rgba(255,255,255,0.1); border:none; color:white; width:32px; height:32px; border-radius:8px; font-size:18px; cursor:pointer;">&times;</button>
                </div>
                <div style="padding:24px; display:flex; flex-direction:column; gap:16px; overflow-y:auto;">
                    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:14px 16px;">
                        <div style="font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">&#128236; Customers (To)</div>
                        <div style="font-size:13px; color:#1e40af; font-weight:500; line-height:1.8; margin-bottom:12px;">\${recipientList}</div>
                        <div style="font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">&#128101; \${internalTeamLabel} (CC)</div>
                        <div style="font-size:12px; color:#3b82f6; font-weight:400; line-height:1.6;">\${ccListHtml}</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px;">
                        <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Subject</div>
                        <div style="font-size:13px; color:#0f172a; font-weight:600;">Order Status Report &mdash; \${customerName}</div>
                    </div>
                    \${machineSection}
                    \${multiNote}
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 16px; display:flex; gap:10px; align-items:flex-start;">
                        <span style="font-size:15px; flex-shrink:0;">&#128203;</span>
                        <div style="font-size:12px; color:#166534; line-height:1.5;">
                            The email will be sent as a <strong>formatted Equipment Order Status Report</strong> including all available logistics dates, handover dates (revised dates highlighted in red), machine status, and attached images.
                        </div>
                    </div>
                    <div style="display:flex; gap:12px; justify-content:flex-end; padding-top:8px; border-top:1px solid #f1f5f9;">
                        <button onclick="document.getElementById('email-preview-modal').remove()" style="padding:10px 24px; border:1px solid #e2e8f0; background:white; color:#64748b; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;">Cancel</button>
                        <button id="btn-confirm-send-email" style="padding:10px 28px; background:#1d4ed8; color:white; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(29,78,216,0.3);">
                            <span>&#128231;</span> Send Now
                        </button>
                    </div>
                </div>
            </div>
        </div>\`);

        document.getElementById('btn-confirm-send-email').onclick = () => {
            document.getElementById('email-preview-modal').remove();
            this.sendEmailUpdate(btn, originalHtml, emailContacts, reportId, customerName, company, machines, ccList);
        };
    }`;

const before = js.slice(0, startIdx);
const after  = js.slice(endIdx);
const result = before + newFunction + after;

fs.writeFileSync(path, result, 'utf8');
console.log('✅ initEmailUpdate replaced cleanly');
console.log('New length:', result.length, 'vs original:', js.length);

// Verify
const check = fs.readFileSync(path, 'utf8');
console.log('Has _getRecipients call:', check.includes("this._getRecipients(company)"));
console.log('Has DOM input reading:', check.includes('input[type="date"]'));
console.log('Has status reading:', check.includes('statusTA?.value'));
console.log('No orphaned code:', !check.includes("const mRevised = row.querySelector('.m-revised')?.value || '';\r\n            if (mName"));
