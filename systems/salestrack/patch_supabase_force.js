const fs = require('fs');
const path = require('path');

const file = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'dashboard_logic.js');
let content = fs.readFileSync(file, 'utf8');

const targetString = `                this.closeListModal();`;

const replacementString = `                // --- HOTFIX: Force update frappe_fmb_report_machine in Supabase to bypass sync delay ---
                if (window.supabase) {
                    try {
                        for (const mu of machinesUpdates) {
                            if (mu.name) {
                                await window.supabase.from('frappe_fmb_report_machine').update({ notes: mu.notes }).eq('name', mu.name);
                            }
                        }
                    } catch (e) { console.error("Force update failed", e); }
                }

                this.closeListModal();`;

if (content.includes(targetString) && !content.includes("Force update frappe_fmb_report_machine")) {
    content = content.replace(targetString, replacementString);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched dashboard_logic.js to force update frappe_fmb_report_machine");
} else {
    console.log("Already patched or target string not found");
}
