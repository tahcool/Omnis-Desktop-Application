const fs = require('fs');
const path = require('path');

const file = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'dashboard_logic.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Fix the "continuous box" by increasing rows and min-height
const defectRegex = /<textarea class="m-defects" rows="1" style="width:100%; min-height:35px;/g;
content = content.replace(defectRegex, '<textarea class="m-defects" rows="2" style="width:100%; min-height:55px;');

const newDefectRegex = /<textarea class="new-defects" rows="1" placeholder="Missing items \/ Defects\.\.\." style="width:100%; min-height:35px;/g;
content = content.replace(newDefectRegex, '<textarea class="new-defects" rows="2" placeholder="Missing items / Defects..." style="width:100%; min-height:55px;');

// 2. Patch saveOrderFull to update olOrdersData instantly to bypass sync delay
const saveSuccessRegex = /(this\.showToast\("Order Saved Successfully", "success"\);)/;
const patchCode = `$1

                // --- HOTFIX: Manually update local orders array so Defects Report works instantly ---
                if (typeof olOrdersData !== 'undefined') {
                    let localOrder = olOrdersData.find(o => o.report_id === reportId);
                    if (localOrder && localOrder.machines) {
                        machinesUpdates.forEach(mu => {
                            let localMachine = localOrder.machines.find(m => m.name === mu.name);
                            if (localMachine) {
                                localMachine.notes = mu.notes;
                            }
                        });
                        
                        newMachines.forEach(nm => {
                            // Can't easily map new machines without IDs, but at least existing ones update.
                        });
                    }
                }
`;

if (saveSuccessRegex.test(content) && !content.includes("HOTFIX: Manually update local orders array")) {
    content = content.replace(saveSuccessRegex, patchCode);
}

fs.writeFileSync(file, content, 'utf8');
console.log("dashboard_logic.js patched for instant updates and larger text box.");
