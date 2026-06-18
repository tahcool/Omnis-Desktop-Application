/**
 * Operator Certificates Logic
 * Handles generating, printing, and verifying operator competence certificates.
 */

class CertificatesLogic {
    constructor() {
        this.trainings = [];
        this.recentCerts = [];
        this.allCerts = [];
        this.initListeners();
    }

    initListeners() {
        // Hook into the main view switcher if possible
        const origSwitch = window.switchToView;
        if (typeof origSwitch === 'function') {
            window.switchToView = (viewId, ...args) => {
                origSwitch(viewId, ...args);
                if (viewId === 'view-certificates') {
                    this.loadTrainings();
                    this.loadRecentCertificates();
        this.loadAllCertificates();
                }
            };
        } else {
            // If switchToView isn't defined yet, wait for it
            setTimeout(() => this.initListeners(), 500);
        }
    }

    async loadTrainings() {
        if (!window.electron) return;
        try {
            const res = await window.electron.invoke('supabase:query', {
                table: 'ft_operator_training',
                method: 'select',
                params: {
                    columns: '*',
                    order: { column: 'training_date', ascending: false },
                    limit: 100
                }
            });

            if (res.ok && res.data) {
                this.trainings = res.data;
                const select = document.getElementById('cert-link-training');
                if (!select) return;
                
                select.innerHTML = '<option value="">-- Type manually below --</option>';
                this.trainings.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    const cDate = t.training_date ? t.training_date.substring(0,10) : 'No Date';
                    opt.textContent = `${t.customer || 'Unknown'} - ${t.machine || 'Unknown'} (${cDate})`;
                    select.appendChild(opt);
                });
            }
        } catch (e) {
            console.error("Failed to load trainings for certificates:", e);
        }
    }

    
    switchTab(tabId) {
        const genTab = document.getElementById('cert-tab-generate');
        const dirTab = document.getElementById('cert-tab-directory');
        const btnGen = document.getElementById('tab-btn-generate');
        const btnDir = document.getElementById('tab-btn-directory');
        if (tabId === 'generate') {
            genTab.style.display = 'block';
            dirTab.style.display = 'none';
            btnGen.style.color = '#0891b2'; btnGen.style.borderBottomColor = '#0891b2';
            btnDir.style.color = '#64748b'; btnDir.style.borderBottomColor = 'transparent';
        } else {
            genTab.style.display = 'none';
            dirTab.style.display = 'block';
            btnDir.style.color = '#0891b2'; btnDir.style.borderBottomColor = '#0891b2';
            btnGen.style.color = '#64748b'; btnGen.style.borderBottomColor = 'transparent';
        }
    }

    async loadRecentCertificates() {
        if (!window.electron) return;
        try {
            const res = await window.electron.invoke('supabase:query', {
                table: 'ft_operator_certificates',
                method: 'select',
                params: {
                    columns: '*',
                    order: { column: 'created_at', ascending: false },
                    limit: 5
                }
            });

            const listDiv = document.getElementById('cert-recent-list');
            if (!listDiv) return;

            if (res.ok && res.data && res.data.length > 0) {
                this.recentCerts = res.data;
                listDiv.innerHTML = '';
                res.data.forEach(c => {
                    listDiv.innerHTML += `
                        <div style="padding:10px 0; border-bottom:1px solid #fde68a;">
                            <div style="font-weight:700;">${c.operator_name}</div>
                            <div style="display:flex; justify-content:space-between; margin-top:4px;">
                                <span>${c.machine_type || '-'}</span>
                                <span style="font-family:monospace;">${c.cert_ref_number}</span>
                            </div>
                        </div>
                    `;
                });
            } else {
                listDiv.innerHTML = '<i>No recent certificates.</i>';
            }
        } catch (e) {
            console.error("Failed to load recent certs:", e);
        }
    }

    populateCertificateFromTraining(trainingId) {
        if (!trainingId) {
            document.getElementById('cert-name').value = '';
            document.getElementById('cert-machine').value = '';
            document.getElementById('cert-date').value = '';
            return;
        }

        const t = this.trainings.find(x => x.id === trainingId);
        if (t) {
            document.getElementById('cert-machine').value = t.machine || '';
            if (t.training_date) {
                document.getElementById('cert-date').value = t.training_date.substring(0, 10);
            }
            // Cannot auto-fill name and ID because training is bulk for multiple operators
            // The user must type the specific operator's name and ID.
            document.getElementById('cert-name').focus();
        }
    }

    generateRefNumber(dateStr) {
        // e.g. 31/05/2021/23
        const parts = dateStr.split('-'); // YYYY-MM-DD
        if (parts.length === 3) {
            const rnd = Math.floor(Math.random() * 900) + 100;
            return `${parts[2]}/${parts[1]}/${parts[0]}/${rnd}`;
        }
        return `CERT-${Date.now().toString().substring(7)}`;
    }

    async generateCertificate() {
        const name = document.getElementById('cert-name').value.trim();
        const idNum = document.getElementById('cert-id').value.trim();
        const machine = document.getElementById('cert-machine').value.trim();
        const duration = document.getElementById('cert-duration').value.trim();
        const date = document.getElementById('cert-date').value;
        const mention = document.getElementById('cert-mention').value.trim();
        const trainingId = document.getElementById('cert-link-training').value;

        if (!name || !idNum || !machine || !date) {
            alert("Name, ID Number, Machine Type, and Completion Date are required!");
            return;
        }

        const btn = document.getElementById('btn-print-cert');
        if (btn) { btn.disabled = true; btn.textContent = "Generating..."; }

        try {
            const ref = this.generateRefNumber(date);
            
            // Format dates for display
            const dObj = new Date(date);
            const day = dObj.getDate();
            const month = dObj.toLocaleString('en-GB', { month: 'long' });
            const year = dObj.getFullYear();
            
            const suffix = (day === 1 || day === 21 || day === 31) ? 'st' : 
                           (day === 2 || day === 22) ? 'nd' : 
                           (day === 3 || day === 23) ? 'rd' : 'th';
                           
            const displayDateText = `${day}${suffix} of ${month} ${year}`;
            const printDateStr = `${day.toString().padStart(2, '0')}/${(dObj.getMonth()+1).toString().padStart(2,'0')}/${year}`;

            // Save to DB
            if (window.electron) {
                const res = await window.electron.invoke('supabase:query', { table: 'ft_operator_certificates', method: 'insert',
                    params: {
                        data: {
                            operator_name: name,
                            id_number: idNum,
                            machine_type: machine,
                            training_duration: duration,
                            completion_date: date,
                            special_mention: mention,
                            cert_ref_number: ref, linked_training_id: trainingId || null } } }); console.log('Insert Result:', res); if (!res.ok) alert('Failed to save certificate: ' + res.error);
            }

            // Generate Base64 for Verification URL
            // payload: {"r": "ref", "n": "name", "id": "idnum", "m": "machine", "d": "date"}
            const payload = JSON.stringify({
                r: ref,
                n: name,
                id: idNum,
                m: machine,
                d: printDateStr
            });
            const encodedPayload = btoa(payload);
            const verifyUrl = `https://machinery-exchange.com/verify.html?data=${encodedPayload}`;

            this.printCertificate({
                name,
                idNum,
                machine,
                duration,
                displayDateText,
                mention,
                ref,
                printDateStr,
                verifyUrl
            });

            // Reload recent list
            this.loadRecentCertificates();
        this.loadAllCertificates();

            // Clear some fields for the next person
            document.getElementById('cert-name').value = '';
            document.getElementById('cert-id').value = '';
            document.getElementById('cert-name').focus();

        } catch (e) {
            console.error(e);
            alert("Error generating certificate.");
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-print" style="margin-right:8px;"></i> Generate & Print'; }
        }
    }

    

    async loadAllCertificates() {
        if (!window.electron) return;
        try {
            const res = await window.electron.invoke('supabase:query', {
                table: 'ft_operator_certificates',
                method: 'select',
                params: {
                    columns: '*',
                    order: { column: 'created_at', ascending: false },
                    limit: 1000
                }
            });

            if (res.ok && res.data) {
                this.allCerts = res.data;
                this.renderDirectory(this.allCerts);
            }
        } catch (e) {
            console.error("Error loading directory", e);
        }
    }

    reprintCertificate(id) {
        const c = this.allCerts.find(cert => String(cert.id) === String(id));
        if (!c) return;
        
        const date = c.completion_date || '';
        let displayDateText = '';
        let printDateStr = '';
        if (date) {
            const dObj = new Date(date);
            const day = dObj.getDate();
            const month = dObj.toLocaleString('en-GB', { month: 'long' });
            const year = dObj.getFullYear();
            const suffix = (day === 1 || day === 21 || day === 31) ? 'st' : 
                           (day === 2 || day === 22) ? 'nd' : 
                           (day === 3 || day === 23) ? 'rd' : 'th';
            displayDateText = `${day}${suffix} of ${month} ${year}`;
            printDateStr = `${day.toString().padStart(2, '0')}/${(dObj.getMonth()+1).toString().padStart(2,'0')}/${year}`;
        }

        const payload = JSON.stringify({
            r: c.cert_ref_number,
            n: c.operator_name,
            id: c.id_number,
            m: c.machine_type,
            d: printDateStr
        });
        const encodedPayload = btoa(payload);
        const verifyUrl = `https://machinery-exchange.com/verify.html?data=${encodedPayload}`;

        this.printCertificate({
            name: c.operator_name,
            idNum: c.id_number,
            machine: c.machine_type,
            duration: c.training_duration || 'Unknown',
            displayDateText: displayDateText,
            printDateStr: printDateStr,
            specialMention: c.special_mention || '',
            ref: c.cert_ref_number,
            verifyUrl: verifyUrl
        });
    }

    renderDirectory(certs) {
        const tbody = document.getElementById('cert-directory-tbody');
        if (!tbody) return;

        if (certs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center; color:#94a3b8; font-style:italic;">No certificates found.</td></tr>';
            return;
        }

        let html = '';
        certs.forEach(c => {
            const cDate = c.completion_date ? c.completion_date.substring(0,10) : '';
            html += `
                
                  <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                      <td style="padding:12px 16px; font-weight:600; color:#0f172a;">${c.operator_name || ''}</td>
                      <td style="padding:12px 16px; color:#334155;">${c.id_number || ''}</td>
                      <td style="padding:12px 16px; color:#334155;">${c.machine_type || ''}</td>
                      <td style="padding:12px 16px; color:#64748b;">${cDate}</td>
                      <td style="padding:12px 16px; font-family:monospace; color:#0ea5e9; font-weight:600;">${c.cert_ref_number || ''}</td>
                      <td style="padding:12px 16px; text-align:right;">
                          <button onclick="window.certLogic.reprintCertificate('${c.id}')" style="background:#f8fafc; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; cursor:pointer; color:#0f172a; font-size:12px; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'"><i class="fas fa-print" style="color:#0891b2; margin-right:4px;"></i> Reprint</button>
                      </td>
                  </tr>

            `;
        });
        tbody.innerHTML = html;
    }

    searchCertificates(query) {
        if (!query) {
            this.renderDirectory(this.allCerts);
            return;
        }
        query = query.toLowerCase();
        const filtered = this.allCerts.filter(c => 
            (c.operator_name && c.operator_name.toLowerCase().includes(query)) ||
            (c.id_number && c.id_number.toLowerCase().includes(query)) ||
            (c.cert_ref_number && c.cert_ref_number.toLowerCase().includes(query))
        );
        this.renderDirectory(filtered);
    }

    printCertificate(data) {
        let logoUrl = new URL('../../assets/images/MXG%20Logo.png', window.location.href).href;
        
        let printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Certificate - ${data.name}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;600;700&display=swap');
                    
                    @page { margin: 0; size: A4 portrait; }
                    body {
                        margin: 0; padding: 0;
                        background: white;
                        display: flex; justify-content: center; align-items: center;
                        height: 100vh;
                        font-family: 'Inter', sans-serif;
                    }
                    .cert-container {
                        width: 210mm;
                        height: 297mm;
                        box-sizing: border-box;
                        padding: 20mm;
                        position: relative;
                        background: white;
                    }
                    .border-outer {
                        border: 8px solid #000;
                        width: 100%; height: 100%;
                        padding: 4px;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .border-inner {
                        border: 2px solid #000;
                        width: 100%; height: 100%;
                        box-sizing: border-box;
                        padding: 40px;
                        text-align: center;
                        position: relative;
                    }
                    .corner-deco {
                        position: absolute;
                        width: 0; height: 0;
                        border-style: solid;
                    }
                    .top-left { top: 0; left: 0; border-width: 40px 40px 0 0; border-color: #000 transparent transparent transparent; }
                    .top-right { top: 0; right: 0; border-width: 0 40px 40px 0; border-color: transparent #000 transparent transparent; }
                    .bottom-left { bottom: 0; left: 0; border-width: 40px 0 0 40px; border-color: transparent transparent transparent #000; }
                    .bottom-right { bottom: 0; right: 0; border-width: 0 0 40px 40px; border-color: transparent transparent #000 transparent; }
                    
                    .logo { height: 100px; margin-bottom: 20px; }
                    
                    .title {
                        font-family: 'Playfair Display', serif;
                        font-size: 42px;
                        margin: 0;
                        line-height: 1.2;
                    }
                    .title-italic { font-style: italic; }
                    
                    .subtitle {
                        font-family: 'Inter', sans-serif;
                        font-size: 52px;
                        color: #fde047; /* Yellowish */
                        text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                        margin: 20px 0 30px;
                        letter-spacing: 2px;
                    }
                    
                    .certify-text {
                        font-size: 20px;
                        font-weight: 600;
                        margin-bottom: 5px;
                    }
                    .mention {
                        font-family: 'Playfair Display', serif;
                        font-style: italic;
                        font-size: 24px;
                        margin-bottom: 20px;
                        min-height: 20px;
                    }
                    
                    .name-line {
                        font-size: 38px;
                        font-weight: 400;
                        border-bottom: 2px solid #000;
                        width: 70%;
                        margin: 0 auto 10px;
                        padding-bottom: 5px;
                    }
                    .id-line {
                        font-size: 20px;
                        font-weight: 600;
                        margin-bottom: 30px;
                    }
                    
                    .description {
                        font-size: 18px;
                        line-height: 1.5;
                        font-weight: 600;
                        margin: 0 auto 40px;
                        width: 85%;
                    }
                    
                    .footer-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        align-items: end;
                        position: absolute;
                        bottom: 40px;
                        left: 40px;
                        right: 40px;
                    }
                    
                    .sig-block {
                        text-align: center;
                    }
                    .sig-line {
                        border-bottom: 2px solid #000;
                        margin-bottom: 5px;
                        height: 40px;
                    }
                    .sig-name {
                        font-style: italic;
                        font-size: 14px;
                    }
                    
                    .date-block {
                        text-align: center;
                    }
                    .date-line {
                        border-bottom: 2px solid #000;
                        font-size: 22px;
                        margin-bottom: 5px;
                        padding-bottom: 2px;
                    }
                    .date-label {
                        font-style: italic;
                        font-size: 16px;
                    }
                    
                    .ref {
                        position: absolute;
                        bottom: 40px;
                        left: 40px;
                        font-size: 10px;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="cert-container">
                    <div class="border-outer">
                        <div class="top-left corner-deco"></div>
                        <div class="top-right corner-deco"></div>
                        <div class="bottom-left corner-deco"></div>
                        <div class="bottom-right corner-deco"></div>
                        
                        <div class="border-inner">
                            <img src="${logoUrl}" class="logo" alt="Machinery Exchange Logo" />
                            <h1 class="title"><span class="title-italic">CERTIFICATE</span><br><span style="font-size: 0.8em; font-style: italic; color: #555;">OF</span><br>COMPETENCE</h1>
                            <h2 class="subtitle">OPERATOR</h2>
                            
                            <div class="certify-text">THIS IS TO CERTIFY THAT</div>
                            <div class="mention">${data.mention || ''}</div>
                            
                            <div class="name-line">${data.name}</div>
                            <div class="id-line">ID Number : ${data.idNum}</div>
                            
                            <div class="description">
                                Has successfully completed a ${data.duration} training course complete on the ${data.displayDateText} and has been certified to operate ${data.machine}.
                            </div>
                            
                            <div id="qrcode-wrapper" style="position: absolute; bottom: 105px; left: 50%; transform: translateX(-50%); text-align: center;">
                                <div style="font-size: 10px; font-weight: 600; margin-bottom: 5px;">Please scan to verify</div>
                                <div id="qrcode-container" style="display: inline-block;"></div>
                                <div style="font-size: 10px; font-weight: 600; margin-top: 5px;">Certificate Ref: ${data.ref}</div>
                            </div>
                            
                            <div class="footer-grid">
                                <div class="sig-block">
                                    <div class="sig-line"></div>
                                    <div class="sig-name">Antony Dube (SRD) Signature</div>
                                </div>
                                <div class="date-block" style="padding: 0 20px;">
                                    <div class="date-line">${data.printDateStr}</div>
                                    <div class="date-label">Date</div>
                                </div>
                                <div class="sig-block">
                                    <div class="sig-line"></div>
                                    <div class="sig-name">Chetan Samji (SRD) Signature</div>
                                </div>
                            </div>
                        </div>
                        
                        
                    </div>
                </div>
                
                <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                <script>
                    setTimeout(() => {
                        // Generate QR Code
                        new QRCode(document.getElementById("qrcode-container"), {
                            text: "${data.verifyUrl}",
                            width: 100,
                            height: 100,
                            colorDark : "#000000",
                            colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.M
                        });
                        
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    }, 200);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}

// Instantiate independently
window.certLogic = new CertificatesLogic();

