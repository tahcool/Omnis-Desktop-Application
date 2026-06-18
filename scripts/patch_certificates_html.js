const fs = require('fs');

let file = 'systems/salestrack/index.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Navigation Item
const navTarget = `<div class="top-nav-item" data-view="view-quotations-list">`;
const navReplacement = `
      <div class="top-nav-item" data-view="view-certificates">
        <span class="icon"><i class="fas fa-certificate"></i></span> <span>Certificates</span>
      </div>
      <div class="top-nav-item" data-view="view-quotations-list">`;

if (!content.includes('data-view="view-certificates"')) {
    content = content.replace(navTarget, navReplacement);
}

// 2. Add View Body
const viewTarget = `<!-- TENDERS & PROJECTS HUB VIEW -->`;
const viewReplacement = `
        <!-- CERTIFICATES VIEW -->
        <div id="view-certificates" class="view-content hidden" style="padding: 80px 40px 40px 40px; flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: #f8fafc;">
            <div style="width: 100%; max-width: 1200px; margin: 0 auto;">
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px; padding-bottom:20px; border-bottom:1px solid #e2e8f0;">
                    <div>
                        <h1 style="margin:0 0 8px; font-size:28px; font-weight:850; color:#0f172a; letter-spacing:-0.03em;">
                            <i class="fas fa-certificate" style="color:#0891b2; margin-right:12px;"></i> Operator Certificates
                        </h1>
                        <p style="margin:0; font-size:14px; color:#64748b; font-weight:500;">
                            Generate and print official Machinery Exchange operator certificates.
                        </p>
                    </div>
                </div>

                <div style="display:flex; gap:24px;">
                    <!-- Form Side -->
                    <div style="flex:1; background:white; border-radius:16px; border:1px solid #e2e8f0; padding:30px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h2 style="margin-top:0; color:#0f172a; font-size:18px; margin-bottom:20px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">Certificate Details</h2>
                        
                        <div style="margin-bottom:16px;">
                            <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">Link to Planned Training (Optional)</label>
                            <select id="cert-link-training" onchange="if(window.salestrack) window.salestrack.populateCertificateFromTraining(this.value)" style="width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; outline:none; background:#f8fafc;">
                                <option value="">-- Type manually below --</option>
                            </select>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
                            <div>
                                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">Operator Name <span style="color:#ef4444">*</span></label>
                                <input type="text" id="cert-name" placeholder="e.g. John Doe" style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; outline:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">ID Number <span style="color:#ef4444">*</span></label>
                                <input type="text" id="cert-id" placeholder="e.g. 63-1234567 A 12" style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; outline:none;">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
                            <div>
                                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">Machine Type <span style="color:#ef4444">*</span></label>
                                <input type="text" id="cert-machine" placeholder="e.g. Excavator ZX210" style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; outline:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">Training Duration</label>
                                <input type="text" id="cert-duration" value="12 day" placeholder="e.g. 12 day" style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; outline:none;">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
                            <div>
                                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">Completion Date <span style="color:#ef4444">*</span></label>
                                <input type="date" id="cert-date" style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; outline:none;">
                            </div>
                            <div>
                                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">Special Mention (Optional)</label>
                                <input type="text" id="cert-mention" placeholder="e.g. With distinction" style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; outline:none;">
                            </div>
                        </div>

                        <div style="text-align:right; margin-top:30px;">
                            <button id="btn-print-cert" onclick="if(window.salestrack) window.salestrack.generateCertificate()" style="padding:12px 24px; background:#0891b2; color:white; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(8, 145, 178, 0.2);"><i class="fas fa-print" style="margin-right:8px;"></i> Generate & Print</button>
                        </div>
                    </div>

                    <!-- Sidebar / Instructions -->
                    <div style="width:300px; display:flex; flex-direction:column; gap:20px;">
                        <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:16px; padding:20px;">
                            <h3 style="margin-top:0; color:#0369a1; font-size:14px; margin-bottom:10px;"><i class="fas fa-info-circle"></i> Verification QR</h3>
                            <p style="margin:0; font-size:12px; color:#0c4a6e; line-height:1.5;">
                                Certificates generated here will automatically include a secure QR Code in the bottom corner. 
                                <br><br>
                                Anyone can scan this QR code using their phone camera to instantly verify the certificate's authenticity on the <b>machinery-exchange.com/verify.html</b> portal.
                            </p>
                        </div>

                        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:16px; padding:20px;">
                            <h3 style="margin-top:0; color:#b45309; font-size:14px; margin-bottom:10px;"><i class="fas fa-history"></i> Recent Certificates</h3>
                            <div id="cert-recent-list" style="font-size:12px; color:#78350f;">
                                <i>No recent certificates.</i>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
        <!-- TENDERS & PROJECTS HUB VIEW -->`;

if (!content.includes('id="view-certificates"')) {
    content = content.replace(viewTarget, viewReplacement);
}

// 3. Add qrcode.js and certificates_logic.js?v=3 references
const scriptTarget = `<script src="cyber_fx.js"></script>`;
const scriptReplacement = `<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script src="certificates_logic.js?v=3"></script>
  <script src="cyber_fx.js"></script>`;

if (!content.includes('qrcode.min.js')) {
    content = content.replace(scriptTarget, scriptReplacement);
}

fs.writeFileSync(file, content);
console.log("Patched index.html with Certificates view.");
