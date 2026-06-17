const fs = require('fs');
const path = require('path');

const file = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'index.html');
let content = fs.readFileSync(file, 'utf8');

// 1. Add + New Handover Button
const searchContainerTarget = `<div style="position:relative; width: 250px;">
            <i class="fas fa-search"`;
const searchContainerReplace = `<button onclick="window.openNewAftersalesForm()" style="height:42px; padding:0 16px; background:#1e293b; color:white; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'"><i class="fas fa-plus"></i> New Handover</button>
          <div style="position:relative; width: 250px;">
            <i class="fas fa-search"`;

if (content.includes(searchContainerTarget) && !content.includes("openNewAftersalesForm()")) {
    content = content.replace(searchContainerTarget, searchContainerReplace);
}

// 2. Add Send Email Button inside Modal
const buttonsTarget = `<div style="display:flex; gap:10px;">
          <button id="as-save-btn" onclick="window.saveAftersalesForm()"`;
const buttonsReplace = `<div style="display:flex; gap:10px;">
          <button id="as-email-btn" onclick="window.sendAftersalesEmail()" style="flex:1; height:48px; background:#3b82f6; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(59,130,246,0.3); transition:all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
            <i class="fas fa-paper-plane"></i> Email Update
          </button>
          <button id="as-save-btn" onclick="window.saveAftersalesForm()"`;

if (content.includes(buttonsTarget) && !content.includes("sendAftersalesEmail()")) {
    content = content.replace(buttonsTarget, buttonsReplace);
}

// 3. Add JS Logic for openNewAftersalesForm
const jsTargetOpen = `    // ── Open form for a record ──
    window.openAftersalesForm = function(recordId) {`;
const jsReplaceOpen = `    // ── Open form for NEW manual record ──
    window.openNewAftersalesForm = function() {
        const overlay = document.getElementById('aftersales-form-overlay');
        if (overlay) overlay.classList.remove('hidden');

        // Clear all fields
        const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        const newId = 'AS-MANUAL-' + Date.now();
        val('as-record-id', newId);
        val('as-order-id', 'MANUAL');
        val('as-company', '');
        val('as-contact-person', '');
        val('as-cell', '');
        val('as-email', '');
        val('as-email2', '');
        val('as-address', '');
        val('as-sale-date', '');
        val('as-oem', '');
        val('as-model', '');
        val('as-location', '');
        val('as-chassis', '');
        val('as-engine', '');
        val('as-warranty-start', '');
        val('as-warranty-end', '');
        val('as-warranty-applicable', '');
        val('as-service-plan', '');
        val('as-training-done', 'No');
        val('as-training-date', '');
        val('as-training-operator', '');
        val('as-notes', '');

        // Update title
        const title = document.getElementById('aftersales-form-title');
        if (title) title.textContent = 'Aftersales: New Manual Handover';
    };

    // ── Open form for a record ──
    window.openAftersalesForm = function(recordId) {`;

if (content.includes(jsTargetOpen) && !content.includes("openNewAftersalesForm = function")) {
    content = content.replace(jsTargetOpen, jsReplaceOpen);
}

// 4. Add JS Logic for sendAftersalesEmail
const jsTargetComplete = `    // ── Complete form ──
    window.completeAftersalesForm = async function() {`;
const jsReplaceComplete = `    // ── Send Email Update ──
    window.sendAftersalesEmail = function() {
        const data = gatherFormData();
        if (!data.email_address) {
            alert('Please enter an Email Address for the customer first.');
            return;
        }

        const subject = encodeURIComponent(\`Aftersales Handover Summary - \${data.equipment_model || 'Equipment'}\`);
        let bodyText = \`Dear \${data.contact_person || 'Customer'},\n\n\`;
        bodyText += \`This is an automated update regarding your recent equipment handover.\n\n\`;
        bodyText += \`EQUIPMENT DETAILS:\n\`;
        bodyText += \`- OEM: \${data.oem || 'N/A'}\n\`;
        bodyText += \`- Model: \${data.equipment_model || 'N/A'}\n\`;
        bodyText += \`- Chassis No: \${data.chassis_number || 'N/A'}\n\`;
        bodyText += \`- Engine No: \${data.engine_number || 'N/A'}\n\n\`;
        
        bodyText += \`WARRANTY & SERVICE:\n\`;
        bodyText += \`- Warranty Period: \${data.warranty_applicable || 'N/A'}\n\`;
        bodyText += \`- Warranty Start: \${data.warranty_start_date || 'N/A'}\n\`;
        bodyText += \`- Warranty End: \${data.warranty_end_date || 'N/A'}\n\`;
        bodyText += \`- Service Plan: \${data.service_plan || 'N/A'}\n\n\`;

        bodyText += \`TRAINING:\n\`;
        bodyText += \`- Completed: \${data.training_done || 'No'}\n\`;
        if (data.training_done === 'Yes') {
            bodyText += \`- Date: \${data.training_date || 'N/A'}\n\`;
            bodyText += \`- Operator Trained: \${data.training_operator || 'N/A'}\n\n\`;
        } else {
            bodyText += \`\n\`;
        }

        if (data.notes) {
            bodyText += \`NOTES:\n\${data.notes}\n\n\`;
        }

        bodyText += \`Thank you for your business!\n\nBest Regards,\nAftersales Team\`;

        const body = encodeURIComponent(bodyText);
        let mailtoLink = \`mailto:\${data.email_address}?subject=\${subject}&body=\${body}\`;
        if (data.additional_email) {
            mailtoLink = \`mailto:\${data.email_address}?cc=\${data.additional_email}&subject=\${subject}&body=\${body}\`;
        }
        
        window.location.href = mailtoLink;
    };

    // ── Complete form ──
    window.completeAftersalesForm = async function() {`;

if (content.includes(jsTargetComplete) && !content.includes("sendAftersalesEmail = function")) {
    content = content.replace(jsTargetComplete, jsReplaceComplete);
}

// 5. Fix save logic to handle new records
const saveLogicTarget = `            // Update local state
            const idx = _aftersalesRecords.findIndex(r => r.id === data.id);
            if (idx >= 0) _aftersalesRecords[idx] = { ..._aftersalesRecords[idx], ...data };`;
const saveLogicReplace = `            // Update local state
            const idx = _aftersalesRecords.findIndex(r => r.id === data.id);
            if (idx >= 0) _aftersalesRecords[idx] = { ..._aftersalesRecords[idx], ...data };
            else _aftersalesRecords.unshift(data);`;
// Fix complete logic as well
const completeLogicTarget = `            // Update local state
            const idx = _aftersalesRecords.findIndex(r => r.id === data.id);
            if (idx >= 0) _aftersalesRecords[idx] = { ..._aftersalesRecords[idx], ...data };`;

if (content.includes(saveLogicTarget)) {
    // replace all instances
    content = content.split(saveLogicTarget).join(saveLogicReplace);
}

fs.writeFileSync(file, content, 'utf8');
console.log("Successfully injected Aftersales features into index.html");
