const fs = require('fs');
const path = require('path');

const file = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'dashboard_logic.js');
let content = fs.readFileSync(file, 'utf8');

// --- 1. Modify the Render Row (Line 4808-4828 area) ---
const renderRowTarget = `<textarea class="m-notes" rows="2" style="flex:1; min-height:60px; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-family:inherit; background:white; line-height:1.4; resize:vertical; border-color:#d1d5db;" placeholder="Machine status...">\${m.notes || ''}</textarea>`;

const renderRowReplacement = `
                            <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                                <textarea class="m-notes" rows="2" style="width:100%; min-height:45px; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-family:inherit; background:white; line-height:1.4; resize:vertical;" placeholder="Machine status...">\${(() => {
                                    let n = m.notes || '';
                                    if(n.includes('[DEFECTS]')) n = n.replace(/\\[DEFECTS\\][\\s\\S]*?\\[\\/DEFECTS\\]/g, '');
                                    return n.trim();
                                })()}</textarea>
                                <textarea class="m-defects" rows="1" style="width:100%; min-height:35px; padding:8px; border:1px solid #fca5a5; border-radius:8px; font-size:12px; font-family:inherit; background:#fef2f2; line-height:1.4; resize:vertical; color:#991b1b;" placeholder="Missing items / Defects...">\${(() => {
                                    const match = (m.notes || '').match(/\\[DEFECTS\\]([\\s\\S]*?)\\[\\/DEFECTS\\]/);
                                    return match ? match[1].trim() : '';
                                })()}</textarea>
                            </div>
`;

if (content.includes(renderRowTarget)) {
    content = content.replace(renderRowTarget, renderRowReplacement);
}

// --- 2. Modify New Machine Row ---
const newRowTarget = `<textarea class="new-notes" rows="2" placeholder="Notes" style="flex:1; min-height:60px; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-family:inherit; background:white; line-height:1.4; resize:vertical;"></textarea>`;

const newRowReplacement = `
                    <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                        <textarea class="new-notes" rows="2" placeholder="Notes" style="width:100%; min-height:45px; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-family:inherit; background:white; line-height:1.4; resize:vertical;"></textarea>
                        <textarea class="new-defects" rows="1" placeholder="Missing items / Defects..." style="width:100%; min-height:35px; padding:8px; border:1px solid #fca5a5; border-radius:8px; font-size:12px; font-family:inherit; background:#fef2f2; line-height:1.4; resize:vertical; color:#991b1b;"></textarea>
                    </div>
`;

if (content.includes(newRowTarget)) {
    content = content.replace(newRowTarget, newRowReplacement);
}

// --- 3. Modify Save Order Full ---
const saveGatherTarget = `const mNotes = row.querySelector('.m-notes')?.value;`;
const saveGatherReplacement = `let mNotes = row.querySelector('.m-notes')?.value || '';
                const mDefects = row.querySelector('.m-defects')?.value || '';
                if (mDefects.trim()) {
                    mNotes = mNotes.trim() + '\\n\\n[DEFECTS]\\n' + mDefects.trim() + '\\n[/DEFECTS]';
                }`;
if (content.includes(saveGatherTarget)) {
    content = content.replace(saveGatherTarget, saveGatherReplacement);
}

const saveNewGatherTarget = `const mNotes = row.querySelector('.new-notes')?.value;`;
const saveNewGatherReplacement = `let mNotes = row.querySelector('.new-notes')?.value || '';
            const mDefects = row.querySelector('.new-defects')?.value || '';
            if (mDefects.trim()) {
                mNotes = mNotes.trim() + '\\n\\n[DEFECTS]\\n' + mDefects.trim() + '\\n[/DEFECTS]';
            }`;
if (content.includes(saveNewGatherTarget)) {
    content = content.replace(saveNewGatherTarget, saveNewGatherReplacement);
}


fs.writeFileSync(file, content, 'utf8');
console.log("Updated dashboard_logic.js");
