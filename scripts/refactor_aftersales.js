const fs = require('fs');

let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

// We need to inject the new form fields into the HTML.
// Let's replace the whole modal content body to be simpler.
// Actually, it's safer to just rewrite the patch script to replace the specific sections.

// 1. Checklist Section replacement
const checklistTarget = `        <!-- Handover Checklist Section -->
        <div style="border:1px solid #e2e8f0; border-radius:12px;">
          <div style="padding:12px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; border-radius:12px 12px 0 0;">
            <i class="fas fa-list-check" style="color:#0ea5e9;"></i>
            <span style="font-size:13px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.05em;">Handover Checklist</span>
          </div>
          <div style="padding:20px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Loaded on Pop Register</label>
              <select id="as-chk-pop" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Machine Data Plate Photo</label>
              <select id="as-chk-machine-photo" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Engine Data Plate Photo</label>
              <select id="as-chk-engine-photo" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">EPR Update</label>
              <select id="as-chk-epr" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Warranty Cert Given</label>
              <select id="as-chk-warranty" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Service Checklist</label>
              <select id="as-chk-service" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Machine Condition Sign-off</label>
              <select id="as-chk-status" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Invoice Copy Uploaded</label>
              <select id="as-chk-invoice" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Client Satisfaction Confirm</label>
              <select id="as-chk-satisfaction" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Delivery Note Copy</label>
              <select id="as-chk-delivery" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
          </div>
        </div>`;

const checklistReplace = `        <!-- Handover Checklist Section -->
        <div style="border:1px solid #e2e8f0; border-radius:12px;">
          <div style="padding:12px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; border-radius:12px 12px 0 0;">
            <i class="fas fa-list-check" style="color:#0ea5e9;"></i>
            <span style="font-size:13px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.05em;">Handover Checklist</span>
          </div>
          <div style="padding:20px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Loaded on Pop Register</label>
              <select id="as-chk-pop" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">EPR Update</label>
              <select id="as-chk-epr" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Machine Data Plate Photo</label>
              <select id="as-chk-machine-photo" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">STS Update</label>
              <select id="as-chk-sts" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Engine Data Plate Photo</label>
              <select id="as-chk-engine-photo" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">S.G In Place</label>
              <select id="as-chk-sg" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Upload to OEM/SHANTUI/OBS</label>
              <select id="as-chk-obs-upload" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
          </div>
        </div>`;

// 2. Add SRD Relationship Manager to Customer Details
const custTarget = `              <div class="form-group" style="grid-column: 1 / -1;">
                <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Address</label>
                <input id="as-address" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
              </div>
            </div>
          </div>`;

const custReplace = `              <div class="form-group" style="grid-column: 1 / -1;">
                <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Address</label>
                <input id="as-address" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
              </div>
              <div class="form-group" style="grid-column: 1 / -1;">
                <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">SRD Relationship Manager</label>
                <input id="as-srd-rm" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
              </div>
            </div>
          </div>`;


// 3. Sign-offs replacement
const sigTarget = `        <div style="border:1px solid #e2e8f0; border-radius:12px; margin-top:24px;">
          <div style="padding:12px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; border-radius:12px 12px 0 0;">
            <i class="fas fa-signature" style="color:#10b981;"></i>
            <span style="font-size:13px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.05em;">Sign-offs & Approvals</span>
          </div>
          <div style="padding:20px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Sales Rep Name</label>
              <input id="as-sig-sales" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;" placeholder="e.g. John Doe">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">PDI Manager Name</label>
              <input id="as-sig-pdi" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Workshop Manager Name</label>
              <input id="as-sig-workshop" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Operations Manager Name</label>
              <input id="as-sig-ops" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
          </div>
        </div>`;

const sigReplace = `        <div style="border:1px solid #e2e8f0; border-radius:12px; margin-top:24px;">
          <div style="padding:12px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; border-radius:12px 12px 0 0;">
            <i class="fas fa-signature" style="color:#10b981;"></i>
            <span style="font-size:13px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.05em;">Sign-offs & Approvals</span>
          </div>
          <div style="padding:20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px;">
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Comm Manager</label>
              <input id="as-sig-comm" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Sales manager</label>
              <input id="as-sig-sales" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">STS- SCC</label>
              <input id="as-sig-sts-scc" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Customer support</label>
              <input id="as-sig-support" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">SRD RM</label>
              <input id="as-sig-srd-rm" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Sales Admin</label>
              <input id="as-sig-admin" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
          </div>
        </div>`;


// 4. Print Logic Replacement
const printLogicTarget = `    // ── Print Form Logic ──`;
const printLogicEnd = `    window.sendAftersalesEmail = function() {`;

// We use regex to replace the whole print logic block
const newPrintLogic = `    // ── Print Form Logic ──
    window.printAftersalesForm = function() {
        const data = gatherFormData();
        
        let logoSrc = 'assets/Omnis-logo.png';
        if (data.company === 'Machinery Exchange') {
            logoSrc = 'assets/me_logo.png';
        } else if (data.company === 'Sinopower') {
            logoSrc = 'assets/sinopower_logo.png';
        }

        const printWindow = window.open('', '_blank');
        const getCheck = (v) => v === 'Yes' ? 'X' : '';

        // Exact replication of the paper layout
        printWindow.document.write(\\\`
            <html>
            <head>
                <title>Aftersales Handover Form</title>
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 40px; color: #000; line-height: 1.6; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    .logo { height: 80px; }
                    .form-title { font-size: 16px; font-weight: bold; margin-top: 30px; margin-right: 50px; }
                    
                    .row { display: flex; margin-bottom: 15px; align-items: flex-end; }
                    .label { min-width: 150px; font-size: 14px; font-weight: bold; }
                    .value-line { flex: 1; border-bottom: 1px dotted #000; font-size: 15px; font-weight: normal; padding-left: 10px; font-family: 'Courier New', Courier, monospace; }
                    
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    
                    .checklist-section { margin-top: 20px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .check-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                    .check-label { font-size: 14px; font-weight: bold; }
                    .check-box { width: 40px; height: 20px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: monospace; font-size:16px; }
                    
                    .sig-section { display: flex; justify-content: space-between; margin-top: 40px; flex-wrap:wrap; gap: 20px; }
                    .sig-block { text-align: center; }
                    .sig-box { width: 120px; height: 30px; border: 2px solid #000; border-radius: 8px; margin-top: 5px; display: flex; align-items: center; justify-content: center; font-weight:bold; font-family: monospace;}
                    .sig-label { font-size: 12px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="\\\${logoSrc}" class="logo" onerror="this.src='assets/Omnis-logo.png'" />
                    <div class="form-title">After Sales Handover Form</div>
                    <div style="font-size:18px; font-weight:bold; font-family: 'Courier New', Courier, monospace; margin-top:30px;">\\\${data.oem || ''}</div>
                </div>

                <div class="grid-2" style="margin-bottom:15px;">
                    <div class="row"><div class="label">Date of Sale</div><div class="value-line">\\\${data.date_of_sale || ''}</div></div>
                    <div class="row"><div class="label">OEM</div><div class="value-line">\\\${data.oem || ''}</div></div>
                </div>

                <div class="row"><div class="label">Equipment Model</div><div class="value-line">\\\${data.equipment_model || ''}</div></div>
                <div class="row"><div class="label">Engine Number</div><div class="value-line">\\\${data.engine_number || ''}</div></div>
                <div class="row"><div class="label">Chasis Number</div><div class="value-line">\\\${data.chassis_number || ''}</div></div>
                <div class="row"><div class="label">Transmission</div><div class="value-line">\\\${data.transmission_type || ''}</div></div>
                <div class="row"><div class="label">Axle Type</div><div class="value-line">\\\${data.axle_type || ''}</div></div>

                <div class="checklist-section">
                    <div>
                        <div class="row" style="margin-bottom:10px;"><div class="label" style="min-width:auto;">Loaded on Pop Register</div></div>
                        <div class="check-row"><div class="check-label">Machine Data Plate Photo</div><div class="check-box">\\\${getCheck(data.photos_machine_plate)}</div></div>
                        <div class="check-row"><div class="check-label">Engine Data Plate Photo</div><div class="check-box">\\\${getCheck(data.photos_engine_plate)}</div></div>
                        <div class="check-row"><div class="check-label">Upload to OEM/SHANTUI/OBS System</div><div class="check-box">\\\${getCheck(data.obs_upload)}</div></div>
                    </div>
                    <div>
                        <div class="row" style="margin-bottom:10px;"><div class="label" style="min-width:auto;">&nbsp;</div></div>
                        <div class="check-row"><div class="check-label">EPR Update</div><div class="check-box">\\\${getCheck(data.epr_update)}</div></div>
                        <div class="check-row"><div class="check-label">STS Update</div><div class="check-box">\\\${getCheck(data.sts_update)}</div></div>
                        <div class="check-row"><div class="check-label">S.G In Place</div><div class="check-box">\\\${getCheck(data.sg_in_place)}</div></div>
                    </div>
                </div>

                <div class="row"><div class="label">Notes / Special Terms</div><div class="value-line">\\\${data.notes || ''}</div></div>
                
                <div class="row"><div class="label">Warranty Applicable</div><div class="value-line">\\\${data.warranty_applicable || ''}</div></div>
                
                <div class="grid-2" style="margin-bottom:15px;">
                    <div class="row"><div class="label">Warranty Start</div><div class="value-line">\\\${data.warranty_start_date || ''}</div></div>
                    <div class="row"><div class="label">End</div><div class="value-line">\\\${data.warranty_end_date || ''}</div></div>
                </div>

                <div class="row"><div class="label">Company</div><div class="value-line">\\\${data.company || ''}</div></div>
                <div class="row"><div class="label">Contact Person & Cell</div><div class="value-line">\\\${data.contact_person || ''} \\\${data.cell_number ? '- ' + data.cell_number : ''}</div></div>
                <div class="row"><div class="label">Email Addresses</div><div class="value-line">\\\${data.email_address || ''}</div></div>
                <div class="row"><div class="label">Email Addresses</div><div class="value-line">\\\${data.additional_email || ''}</div></div>
                <div class="row"><div class="label">Machine location</div><div class="value-line">\\\${data.location || ''}</div></div>
                <div class="row"><div class="label">Physical Address</div><div class="value-line">\\\${data.address || ''}</div></div>
                <div class="row"><div class="label">SRD Relationship Manager</div><div class="value-line">\\\${data.srd_rm || ''}</div></div>

                <div class="sig-section">
                    <div class="sig-block"><div class="sig-label">Comm Manager</div><div class="sig-box">\\\${data.sig_comm || ''}</div></div>
                    <div class="sig-block"><div class="sig-label">Sales manager</div><div class="sig-box">\\\${data.sig_sales || ''}</div></div>
                    <div class="sig-block"><div class="sig-label">STS- SCC</div><div class="sig-box">\\\${data.sig_sts_scc || ''}</div></div>
                    <div class="sig-block"><div class="sig-label">Customer support</div><div class="sig-box">\\\${data.sig_support || ''}</div></div>
                </div>
                <div class="sig-section" style="justify-content: flex-start; margin-top:20px; gap:40px;">
                    <div class="sig-block"><div class="sig-label">SRD RM</div><div class="sig-box">\\\${data.sig_srd_rm || ''}</div></div>
                    <div class="sig-block"><div class="sig-label">Sales Admin</div><div class="sig-box">\\\${data.sig_admin || ''}</div></div>
                </div>

            </body>
            </html>
        \`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

`;

html = html.replace(checklistTarget, checklistReplace);
html = html.replace(custTarget, custReplace);
html = html.replace(sigTarget, sigReplace);

html = html.replace(/    \/\/ ── Print Form Logic ──[\s\S]*?window\.sendAftersalesEmail = function\(\) \{/, newPrintLogic + '    window.sendAftersalesEmail = function() {');


// 5. Update JS get/val logic
html = html.replace(/photos_engine_plate:\s*get\('as-chk-engine-photo'\),[^]*?ops_mgr:\s*get\('as-sig-ops'\),/, `photos_engine_plate: get('as-chk-engine-photo'),
            obs_upload: get('as-chk-obs-upload'),
            epr_update: get('as-chk-epr'),
            sts_update: get('as-chk-sts'),
            sg_in_place: get('as-chk-sg'),
            srd_rm: get('as-srd-rm'),
            sig_comm: get('as-sig-comm'),
            sig_sales: get('as-sig-sales'),
            sig_sts_scc: get('as-sig-sts-scc'),
            sig_support: get('as-sig-support'),
            sig_srd_rm: get('as-sig-srd-rm'),
            sig_admin: get('as-sig-admin'),`);

html = html.replace(/val\('as-chk-engine-photo',\s*rec\.photos_engine_plate[^]*?val\('as-sig-ops',\s*rec\.ops_mgr\);/, `val('as-chk-engine-photo', rec.photos_engine_plate || 'No');
          val('as-chk-obs-upload', rec.obs_upload || 'No');
          val('as-chk-epr', rec.epr_update || 'No');
          val('as-chk-sts', rec.sts_update || 'No');
          val('as-chk-sg', rec.sg_in_place || 'No');
          val('as-srd-rm', rec.srd_rm || '');
          val('as-sig-comm', rec.sig_comm || '');
          val('as-sig-sales', rec.sig_sales || '');
          val('as-sig-sts-scc', rec.sig_sts_scc || '');
          val('as-sig-support', rec.sig_support || '');
          val('as-sig-srd-rm', rec.sig_srd_rm || '');
          val('as-sig-admin', rec.sig_admin || '');`);

html = html.replace(/val\('as-chk-engine-photo',\s*'No'\);[^]*?val\('as-sig-ops',\s*''\);/, `val('as-chk-engine-photo', 'No');
        val('as-chk-obs-upload', 'No');
        val('as-chk-epr', 'No');
        val('as-chk-sts', 'No');
        val('as-chk-sg', 'No');
        val('as-srd-rm', '');
        val('as-sig-comm', '');
        val('as-sig-sales', '');
        val('as-sig-sts-scc', '');
        val('as-sig-support', '');
        val('as-sig-srd-rm', '');
        val('as-sig-admin', '');`);


fs.writeFileSync('systems/salestrack/index.html', html);
console.log('Successfully refactored Aftersales form to match paper template exactly.');
