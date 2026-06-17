const fs = require('fs');
let htmlPath = 'systems/salestrack/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Add Transmission and Axle Type
const engineHtml = `              <div class="form-group">
                <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Engine Number</label>
                <input id="as-engine" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
              </div>
            </div>`;

const newMachineHtml = `              <div class="form-group">
                <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Engine Number</label>
                <input id="as-engine" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div class="form-group">
                <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Transmission</label>
                <input id="as-transmission" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
              </div>
              <div class="form-group">
                <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Axle Type</label>
                <input id="as-axle" type="text" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
              </div>
            </div>`;

if (!content.includes('id="as-transmission"')) {
    content = content.replace(engineHtml, newMachineHtml);
}

// 2. Add Checklist Section and Signatures
const warrantySectionMatch = `        <!-- Notes -->`;
const checklistAndSigHtml = `        <!-- Handover Checklist Section -->
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
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Upload to OEM/OBS System</label>
              <select id="as-chk-obs" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">EPR Update</label>
              <select id="as-chk-epr" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">STS Update</label>
              <select id="as-chk-sts" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">S.G In Place</label>
              <select id="as-chk-sg" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600; background:#fff;"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
          </div>
        </div>

        <!-- Signatures Section -->
        <div style="border:1px solid #e2e8f0; border-radius:12px;">
          <div style="padding:12px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; border-radius:12px 12px 0 0;">
            <i class="fas fa-file-signature" style="color:#8b5cf6;"></i>
            <span style="font-size:13px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.05em;">Sign-offs & Approvals</span>
          </div>
          <div style="padding:20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px;">
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">SRD Relationship Manager</label>
              <input id="as-sig-srdrm1" type="text" placeholder="Manager Name" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Comm Manager</label>
              <input id="as-sig-comm" type="text" placeholder="Manager Name" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Sales Manager</label>
              <input id="as-sig-sales" type="text" placeholder="Manager Name" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">STS-SCC</label>
              <input id="as-sig-sts" type="text" placeholder="Manager Name" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Customer Support</label>
              <input id="as-sig-support" type="text" placeholder="Manager Name" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">SRD RM (Final)</label>
              <input id="as-sig-srdrm2" type="text" placeholder="Manager Name" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:6px;">Sales Admin</label>
              <input id="as-sig-admin" type="text" placeholder="Manager Name" style="width:100%; height:40px; border-radius:8px; border:1px solid #e2e8f0; padding:0 12px; font-size:13px; font-weight:600;">
            </div>
          </div>
        </div>

        <!-- Notes -->`;

if (!content.includes('id="as-chk-pop"')) {
    content = content.replace(warrantySectionMatch, checklistAndSigHtml);
}

// 3. Add Print Button next to Action Buttons
const buttonsHtml = `        <!-- Action Buttons -->
        <div style="display:flex; gap:10px;">
          <button id="as-email-btn" onclick="window.sendAftersalesEmail()" style="flex:1; height:48px; background:#3b82f6; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(59,130,246,0.3); transition:all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
            <i class="fas fa-paper-plane"></i> Email Update
          </button>
          <button id="as-save-btn" onclick="window.saveAftersalesForm()" style="flex:1; height:48px; background:#f59e0b; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(245,158,11,0.3); transition:all 0.2s;">
            <i class="fas fa-save"></i> Save Progress
          </button>
          <button id="as-complete-btn" onclick="window.completeAftersalesForm()" style="flex:1; height:48px; background:#10b981; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(16,185,129,0.3); transition:all 0.2s;">
            <i class="fas fa-check-double"></i> Mark Completed
          </button>
        </div>`;

const newButtonsHtml = `        <!-- Action Buttons -->
        <div style="display:flex; gap:10px;">
          <button id="as-print-btn" onclick="window.printAftersalesForm()" style="flex:1; height:48px; background:#64748b; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(100,116,139,0.3); transition:all 0.2s;">
            <i class="fas fa-print"></i> Print Form
          </button>
          <button id="as-email-btn" onclick="window.sendAftersalesEmail()" style="flex:1; height:48px; background:#3b82f6; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(59,130,246,0.3); transition:all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
            <i class="fas fa-paper-plane"></i> Email Update
          </button>
          <button id="as-save-btn" onclick="window.saveAftersalesForm()" style="flex:1; height:48px; background:#f59e0b; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(245,158,11,0.3); transition:all 0.2s;">
            <i class="fas fa-save"></i> Save Progress
          </button>
          <button id="as-complete-btn" onclick="window.completeAftersalesForm()" style="flex:1; height:48px; background:#10b981; color:white; border:none; border-radius:10px; font-weight:800; font-size:14px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer; box-shadow:0 10px 15px -3px rgba(16,185,129,0.3); transition:all 0.2s;">
            <i class="fas fa-check-double"></i> Mark Completed
          </button>
        </div>`;

if (!content.includes('id="as-print-btn"')) {
    content = content.replace(buttonsHtml, newButtonsHtml);
}

fs.writeFileSync(htmlPath, content);
console.log('HTML UI Patched');
