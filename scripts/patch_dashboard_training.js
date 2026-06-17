const fs = require('fs');
const path = require('path');

let jsPath = path.join('systems', 'salestrack', 'dashboard_logic.js');
let content = fs.readFileSync(jsPath, 'utf8');

// 1. Replace the button area
let target = `                                <button onclick="salestrack.openDefectsModal('\${(m.item_name || m.machine || m.item || '').replace(/'/g, \\\\\\'').replace(/\\"/g, '&quot;')}', '\${(reportId || '').replace(/'/g, \\\\\\'')}', '\${safeCustomerName}')" title="Log Defects" style="align-self:flex-start; background:#fffbeb; color:#d97706; border:1px solid #fde68a; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all 0.2s;"><i class="fas fa-exclamation-triangle"></i> Defects Log</button>`;

let replacement = `                                <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                                    <button onclick="salestrack.openDefectsModal('\${(m.item_name || m.machine || m.item || '').replace(/'/g, \\\\\\'').replace(/\\"/g, '&quot;')}', '\${(reportId || '').replace(/'/g, \\\\\\'')}', '\${safeCustomerName}')" title="Log Defects" style="background:#fffbeb; color:#d97706; border:1px solid #fde68a; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all 0.2s;"><i class="fas fa-exclamation-triangle"></i> Defects Log</button>
                                    <button onclick="salestrack.openBookTrainingModal('\${(m.item_name || m.machine || m.item || '').replace(/'/g, \\\\\\'').replace(/\\"/g, '&quot;')}', '\${(reportId || '').replace(/'/g, \\\\\\'')}', '\${safeCustomerName}')" title="Book Operator Training" style="background:#ecfeff; color:#0891b2; border:1px solid #a5f3fc; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all 0.2s;"><i class="fas fa-user-graduate"></i> Book Training</button>
                                </div>`;

if(content.includes(target)) {
    content = content.replace(target, replacement);
    console.log("Replaced button area successfully.");
} else {
    console.log("Could not find button target area exactly. Will use regex.");
    let regex = /<button onclick="salestrack.openDefectsModal[^>]+>.*?<\/button>/g;
    content = content.replace(regex, (match) => {
        let trainingBtn = match.replace('openDefectsModal', 'openBookTrainingModal')
                               .replace('Log Defects', 'Book Operator Training')
                               .replace('#fffbeb', '#ecfeff')
                               .replace('#d97706', '#0891b2')
                               .replace('#fde68a', '#a5f3fc')
                               .replace('fa-exclamation-triangle', 'fa-user-graduate')
                               .replace('Defects Log', 'Book Training');
        return `<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                    ${match}
                    ${trainingBtn}
                </div>`;
    });
}

// 2. Append the new methods to the end of SalestrackDashboard class, before the very last closing brace.
// Instead of that, let's just append to prototype globally.
let classEndRegex = /(export default new SalestrackDashboard\(\);|window\.salestrack = new SalestrackDashboard\(\);)/;
let injection = `

    async openBookTrainingModal(machineName, orderId, customerName) {
        let html = \`
            <div style="padding:24px;">
                <h3 style="margin-top:0; color:#0f172a; margin-bottom:20px;"><i class="fas fa-user-graduate" style="color:#0891b2; margin-right:8px;"></i> Book Operator Training</h3>
                
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Customer / Order</label>
                    <input type="text" value="\${customerName}" readonly style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; background:#f8fafc; color:#475569; cursor:not-allowed;">
                    <input type="hidden" id="tr-order-id" value="\${orderId}">
                    <input type="hidden" id="tr-customer" value="\${customerName}">
                </div>
                
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Machine</label>
                    <input type="text" id="tr-machine" value="\${machineName}" readonly style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; background:#f8fafc; color:#475569; cursor:not-allowed;">
                </div>
                
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Training Location <span style="color:#ef4444;">*</span></label>
                    <input type="text" id="tr-location" placeholder="e.g. Customer Site, Workshop..." style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; focus:border-blue-500;">
                </div>
                
                <div style="margin-bottom:16px; display:flex; gap:16px;">
                    <div style="flex:1;">
                        <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Training Date <span style="color:#ef4444;">*</span></label>
                        <input type="date" id="tr-date" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Number of Operators <span style="color:#ef4444;">*</span></label>
                        <input type="number" id="tr-operators" value="1" min="1" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
                    </div>
                </div>

                <div style="margin-bottom:24px;">
                    <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Trainer Name (Optional)</label>
                    <input type="text" id="tr-trainer" placeholder="Assigned trainer..." style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
                </div>
                
                <div style="display:flex; justify-content:flex-end; gap:12px;">
                    <button onclick="salestrack.closeListModal()" style="padding:10px 20px; border:1px solid #cbd5e1; background:white; color:#475569; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">Cancel</button>
                    <button id="btn-save-training" onclick="salestrack.submitOperatorTraining()" style="padding:10px 24px; background:#0891b2; color:white; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(8, 145, 178, 0.2);">Save Training</button>
                </div>
            </div>
        \`;
        
        // Use openListModal but intercept the standard header to make it look nicer if we want, or just use it as is.
        this.openListModal("Book Training", html, "600px");
    }

    async submitOperatorTraining() {
        const orderId = document.getElementById('tr-order-id').value;
        const customer = document.getElementById('tr-customer').value;
        const machine = document.getElementById('tr-machine').value;
        const location = document.getElementById('tr-location').value;
        const tDate = document.getElementById('tr-date').value;
        const operators = document.getElementById('tr-operators').value;
        const trainer = document.getElementById('tr-trainer').value;

        if (!location || !tDate || !operators) {
            alert("Location, Date, and Number of Operators are required!");
            return;
        }

        const btn = document.getElementById('btn-save-training');
        if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

        try {
            const res = await window.electron.invoke('supabase:query', {
                table: 'ft_operator_training',
                method: 'insert',
                params: {
                    record: {
                        order_id: orderId,
                        customer: customer,
                        machine: machine,
                        location: location,
                        training_date: tDate,
                        number_of_operators: parseInt(operators),
                        trainer_name: trainer,
                        status: 'Planned'
                    }
                }
            });

            if (!res.ok) {
                alert("Failed to save training: " + JSON.stringify(res.error || res));
            } else {
                alert("Training booked successfully!");
                this.closeListModal();
            }
        } catch(e) {
            console.error("Training booking error:", e);
            alert("Error saving training.");
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = "Save Training"; }
        }
    }

`;

if (!content.includes('openBookTrainingModal')) {
    content = content.replace(classEndRegex, injection + "$1");
    fs.writeFileSync(jsPath, content);
    console.log("Injected logic successfully.");
} else {
    console.log("Logic already exists in file.");
}
