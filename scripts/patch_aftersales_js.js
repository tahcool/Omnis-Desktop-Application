const fs = require('fs');
let htmlPath = 'systems/salestrack/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Update gatherFormData
const gatherTarget = `            equipment_model: get('as-model'),
            location: get('as-location'),
            chassis_number: get('as-chassis'),
            engine_number: get('as-engine'),
            warranty_start_date: get('as-warranty-start') || null,
            warranty_end_date: get('as-warranty-end') || null,
            warranty_applicable: get('as-warranty-applicable'),
            service_plan: get('as-service-plan'),
            training_done: get('as-training-done'),
            training_date: get('as-training-date') || null,
            training_operator: get('as-training-operator'),
            notes: get('as-notes'),`;

const gatherReplace = `            equipment_model: get('as-model'),
            location: get('as-location'),
            chassis_number: get('as-chassis'),
            engine_number: get('as-engine'),
            transmission: get('as-transmission'),
            axle_type: get('as-axle'),
            chk_pop: get('as-chk-pop'),
            chk_machine_photo: get('as-chk-machine-photo'),
            chk_engine_photo: get('as-chk-engine-photo'),
            chk_obs: get('as-chk-obs'),
            chk_epr: get('as-chk-epr'),
            chk_sts: get('as-chk-sts'),
            chk_sg: get('as-chk-sg'),
            sig_srdrm1: get('as-sig-srdrm1'),
            sig_comm: get('as-sig-comm'),
            sig_sales: get('as-sig-sales'),
            sig_sts: get('as-sig-sts'),
            sig_support: get('as-sig-support'),
            sig_srdrm2: get('as-sig-srdrm2'),
            sig_admin: get('as-sig-admin'),
            warranty_start_date: get('as-warranty-start') || null,
            warranty_end_date: get('as-warranty-end') || null,
            warranty_applicable: get('as-warranty-applicable'),
            service_plan: get('as-service-plan'),
            training_done: get('as-training-done'),
            training_date: get('as-training-date') || null,
            training_operator: get('as-training-operator'),
            notes: get('as-notes'),`;

if (content.includes(gatherTarget)) {
    content = content.replace(gatherTarget, gatherReplace);
}

// 2. Update openAftersalesForm
const openTarget = `        const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        val('as-record-id', rec.id);
        val('as-order-id', rec.order_id);
        val('as-company', rec.company);
        val('as-contact-person', rec.contact_person);
        val('as-cell', rec.cell_number);
        val('as-email', rec.email_address);
        val('as-email2', rec.additional_email);
        val('as-address', rec.physical_address);
        val('as-sale-date', rec.date_of_sale ? rec.date_of_sale.split('T')[0] : '');
        val('as-oem', rec.oem);
        val('as-model', rec.equipment_model);
        val('as-location', rec.location);
        val('as-chassis', rec.chassis_number);
        val('as-engine', rec.engine_number);
        val('as-warranty-start', rec.warranty_start_date ? rec.warranty_start_date.split('T')[0] : '');
        val('as-warranty-end', rec.warranty_end_date ? rec.warranty_end_date.split('T')[0] : '');
        val('as-warranty-applicable', rec.warranty_applicable);
        val('as-service-plan', rec.service_plan);
        val('as-training-done', rec.training_done || 'No');
        val('as-training-date', rec.training_date ? rec.training_date.split('T')[0] : '');
        val('as-training-operator', rec.training_operator);
        val('as-notes', rec.notes);`;

const openReplace = `        const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        val('as-record-id', rec.id);
        val('as-order-id', rec.order_id);
        val('as-company', rec.company);
        val('as-contact-person', rec.contact_person);
        val('as-cell', rec.cell_number);
        val('as-email', rec.email_address);
        val('as-email2', rec.additional_email);
        val('as-address', rec.physical_address);
        val('as-sale-date', rec.date_of_sale ? rec.date_of_sale.split('T')[0] : '');
        val('as-oem', rec.oem);
        val('as-model', rec.equipment_model);
        val('as-location', rec.location);
        val('as-chassis', rec.chassis_number);
        val('as-engine', rec.engine_number);
        val('as-transmission', rec.transmission);
        val('as-axle', rec.axle_type);
        val('as-chk-pop', rec.chk_pop || 'No');
        val('as-chk-machine-photo', rec.chk_machine_photo || 'No');
        val('as-chk-engine-photo', rec.chk_engine_photo || 'No');
        val('as-chk-obs', rec.chk_obs || 'No');
        val('as-chk-epr', rec.chk_epr || 'No');
        val('as-chk-sts', rec.chk_sts || 'No');
        val('as-chk-sg', rec.chk_sg || 'No');
        val('as-sig-srdrm1', rec.sig_srdrm1);
        val('as-sig-comm', rec.sig_comm);
        val('as-sig-sales', rec.sig_sales);
        val('as-sig-sts', rec.sig_sts);
        val('as-sig-support', rec.sig_support);
        val('as-sig-srdrm2', rec.sig_srdrm2);
        val('as-sig-admin', rec.sig_admin);
        val('as-warranty-start', rec.warranty_start_date ? rec.warranty_start_date.split('T')[0] : '');
        val('as-warranty-end', rec.warranty_end_date ? rec.warranty_end_date.split('T')[0] : '');
        val('as-warranty-applicable', rec.warranty_applicable);
        val('as-service-plan', rec.service_plan);
        val('as-training-done', rec.training_done || 'No');
        val('as-training-date', rec.training_date ? rec.training_date.split('T')[0] : '');
        val('as-training-operator', rec.training_operator);
        val('as-notes', rec.notes);`;

if (content.includes(openTarget)) {
    content = content.replace(openTarget, openReplace);
}

// 3. Add Print Logic Function before gatherFormData
const gatherFuncTarget = `    // ── Helper to read modal fields ──`;

const printFunc = `    // ── Print Aftersales Form ──
    window.printAftersalesForm = function() {
        const data = gatherFormData();
        
        let logoSrc = 'assets/images/logo.png'; // default Omnis logo
        if (data.company && data.company.toLowerCase().includes('machinery exchange')) {
            logoSrc = 'assets/images/machinery-exchange.jpg';
        } else if (data.company && data.company.toLowerCase().includes('sinopower')) {
            logoSrc = 'assets/images/sinopower-logo.png';
        }

        const fdate = (d) => {
            if (!d) return '';
            const dt = new Date(d);
            return \`\${dt.getDate().toString().padStart(2,'0')}/\${(dt.getMonth()+1).toString().padStart(2,'0')}/\${dt.getFullYear().toString().slice(-2)}\`;
        };

        const drawCheck = (val) => {
            const checked = val === 'Yes' ? 'X' : ' ';
            return \`<div style="width: 30px; height: 16px; border: 2px solid #000; display: inline-block; text-align: center; line-height: 14px; font-weight: bold; font-family: monospace;">\${checked}</div>\`;
        };

        const drawSig = (val) => {
            return \`<div style="width: 100%; height: 35px; border: 2px solid #000; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-family: 'Brush Script MT', cursive; font-size: 18px;">\${val || ''}</div>\`;
        };

        const printWindow = window.open('', '', 'width=800,height=900');
        printWindow.document.write(\`
            <html>
            <head>
                <title>Print After Sales Handover Form</title>
                <style>
                    @page { size: A4 portrait; margin: 15mm; }
                    body { font-family: Arial, sans-serif; font-size: 14px; color: #000; line-height: 1.5; padding: 20px; }
                    .header-container { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
                    .header-container img { height: 60px; max-width: 180px; object-fit: contain; }
                    .form-title { font-size: 18px; font-weight: bold; flex: 1; text-align: center; }
                    .row { display: flex; align-items: baseline; margin-bottom: 12px; }
                    .label { width: 180px; font-weight: bold; font-size: 13px; }
                    .value { flex: 1; border-bottom: 1px dotted #000; padding-bottom: 2px; font-family: 'Courier New', Courier, monospace; font-size: 15px; }
                    .short-label { width: 100px; font-weight: bold; font-size: 13px; text-align: right; padding-right: 10px; }
                    
                    .checks-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; margin-bottom: 15px; }
                    .check-row { display: flex; align-items: center; justify-content: space-between; padding-right: 40px; }
                    .check-label { font-size: 13px; font-weight: bold; }

                    .sigs-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 30px; }
                    .sig-box { display: flex; flex-direction: column; align-items: center; }
                    .sig-label { font-size: 11px; font-weight: bold; margin-bottom: 5px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header-container">
                    <img src="\${window.location.origin}/\${logoSrc}" onerror="this.style.display='none'" />
                    <div class="form-title">After Sales Handover Form</div>
                    <div style="width: 150px;"></div>
                </div>

                <div class="row">
                    <div class="label">Date of Sale</div>
                    <div class="value">\${fdate(data.date_of_sale)}</div>
                    <div class="short-label">OEM</div>
                    <div class="value" style="font-family: Arial, sans-serif;">\${data.oem || ''}</div>
                </div>
                <div class="row"><div class="label">Equipment Model</div><div class="value">\${data.equipment_model || ''}</div></div>
                <div class="row"><div class="label">Engine Number</div><div class="value">\${data.engine_number || ''}</div></div>
                <div class="row"><div class="label">Chasis Number</div><div class="value">\${data.chassis_number || ''}</div></div>
                <div class="row"><div class="label">Transmission</div><div class="value">\${data.transmission || ''}</div></div>
                <div class="row"><div class="label">Axle Type</div><div class="value">\${data.axle_type || ''}</div></div>

                <div class="checks-container">
                    <div>
                        <div class="check-row"><span class="check-label">Loaded on Pop Register</span></div>
                        <div class="check-row"><span class="check-label">Machine Data Plate Photo</span>\${drawCheck(data.chk_machine_photo)}</div>
                        <div class="check-row"><span class="check-label">Engine Data Plate Photo</span>\${drawCheck(data.chk_engine_photo)}</div>
                        <div class="check-row"><span class="check-label">Upload to OEM/SHANTUI/OBS System</span>\${drawCheck(data.chk_obs)}</div>
                    </div>
                    <div>
                        <div class="check-row"><span class="check-label">EPR Update</span>\${drawCheck(data.chk_epr)}</div>
                        <div class="check-row"><span class="check-label">STS Update</span>\${drawCheck(data.chk_sts)}</div>
                        <div class="check-row"><span class="check-label">S.G In Place</span>\${drawCheck(data.chk_sg)}</div>
                    </div>
                </div>

                <div class="row" style="margin-top: 15px;"><div class="label">Notes / Special Terms</div><div class="value">\${data.notes || 'N/A'}</div></div>
                <div class="row"><div class="label">Warranty Applicable</div><div class="value">\${data.warranty_applicable || ''}</div></div>
                
                <div class="row">
                    <div class="label">Warranty Start</div>
                    <div class="value">\${fdate(data.warranty_start_date)}</div>
                    <div class="short-label">End</div>
                    <div class="value">\${fdate(data.warranty_end_date)}</div>
                </div>

                <div class="row" style="margin-top: 15px;"><div class="label">Company</div><div class="value" style="font-family: Arial, sans-serif;">\${data.company || ''}</div></div>
                <div class="row">
                    <div class="label">Contact Person & Cell</div>
                    <div class="value" style="font-family: Arial, sans-serif;">\${data.contact_person || ''} &nbsp;&nbsp; \${data.cell_number || ''}</div>
                </div>
                <div class="row"><div class="label">Email Addresses</div><div class="value" style="font-family: Arial, sans-serif;">\${data.email_address || ''}</div></div>
                <div class="row"><div class="label">Email Addresses</div><div class="value" style="font-family: Arial, sans-serif;">\${data.additional_email || ''}</div></div>
                <div class="row"><div class="label">Machine location</div><div class="value" style="font-family: Arial, sans-serif;">\${data.location || ''}</div></div>
                <div class="row"><div class="label">Physical Address</div><div class="value" style="font-family: Arial, sans-serif;">\${data.physical_address || ''}</div></div>
                <div class="row"><div class="label">SRD Relationship Manager</div><div class="value" style="font-family: Arial, sans-serif;">\${data.sig_srdrm1 || ''}</div></div>

                <div class="sigs-container" style="margin-top:20px;">
                    <div class="sig-box"><div class="sig-label">Comm Manager</div>\${drawSig(data.sig_comm)}</div>
                    <div class="sig-box"><div class="sig-label">Sales manager</div>\${drawSig(data.sig_sales)}</div>
                    <div class="sig-box"><div class="sig-label">STS- SCC</div>\${drawSig(data.sig_sts)}</div>
                    <div class="sig-box"><div class="sig-label">Customer support</div>\${drawSig(data.sig_support)}</div>
                </div>
                
                <div class="sigs-container" style="grid-template-columns: 1fr 1fr 1fr; max-width: 75%; margin-top:20px;">
                    <div class="sig-box"><div class="sig-label">SRD RM</div>\${drawSig(data.sig_srdrm2)}</div>
                    <div></div> <!-- spacer -->
                    <div class="sig-box"><div class="sig-label">Sales Admin</div>\${drawSig(data.sig_admin)}</div>
                </div>
            </body>
            </html>
        \`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    // ── Helper to read modal fields ──`;

if (!content.includes('window.printAftersalesForm = function()')) {
    content = content.replace(gatherFuncTarget, printFunc);
}

fs.writeFileSync(htmlPath, content);
console.log('JS Logic Patched');
