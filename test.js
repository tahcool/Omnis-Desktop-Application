
    // PSV State
    window._psvState = {
        files: [],
        step: 1,
        customers: [],
        machines: [], // all fleetrack machines
        selectedCustomerMachines: []
    };

    window.loadPsvList = async function() {
        const gridBody = document.getElementById('psv-grid-body');
        if(!gridBody || !window.supabase) return;

        gridBody.innerHTML = '<div style="padding:60px; text-align:center; color:#94a3b8; font-weight:600;"><i class="fas fa-spinner fa-spin"></i> Loading PSV records...</div>';

        try {
            const { data, error } = await window.supabase
                .from('psv_logs')
                .select('*')
                .order('visit_date', { ascending: false });

            if(error) throw error;

            if(!data || data.length === 0) {
                gridBody.innerHTML = '<div style="padding:60px; text-align:center; color:#94a3b8; font-style:italic;">No Product Support Visits found.</div>';
                
                // Reset stats
                document.getElementById('psv-stat-total').innerText = '0';
                document.getElementById('psv-stat-action').innerText = '0';
                document.getElementById('psv-stat-ft').innerText = '0';
                document.getElementById('psv-stat-emails').innerText = '0';
                return;
            }

            // Calculate stats
            const now = new Date();
            const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
            
            let total30d = 0;
            let actionReq = 0;
            let awaitingFt = 0;
            let emailsSent = 0;

            data.forEach(p => {
                const visitDate = new Date(p.visit_date);
                if(visitDate >= thirtyDaysAgo) total30d++;
                if(p.action_required) actionReq++;
                if(p.action_required && !p.fleetrack_notified) awaitingFt++;
                if(p.customer_email_sent) emailsSent++;
            });

            document.getElementById('psv-stat-total').innerText = total30d;
            document.getElementById('psv-stat-action').innerText = actionReq;
            document.getElementById('psv-stat-ft').innerText = awaitingFt;
            document.getElementById('psv-stat-emails').innerText = emailsSent;

            // Render grid
            gridBody.innerHTML = data.map(p => {
                const condColor = p.overall_condition === 'Good' ? '#10b981' : (p.overall_condition === 'Fair' ? '#f59e0b' : '#ef4444');
                const statColor = p.status === 'Closed' ? '#64748b' : (p.status === 'Acknowledged' ? '#10b981' : '#3b82f6');
                const truncatedFindings = (p.findings || '').length > 60 ? (p.findings || '').substring(0, 60) + '...' : (p.findings || '');
                const safePsv = JSON.stringify(p).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                
                let ftWarning = '';
                if(p.action_required) {
                    ftWarning = `<i class="fas fa-exclamation-triangle" style="color:#f59e0b; margin-left:6px;" title="Action Required"></i>`;
                }

                return `
                <div class="list-row" onclick="window.psvOpenDetail('${p.id}', '${safePsv}')" style="display:grid; grid-template-columns:100px 2fr 2fr 120px 3fr 150px; padding:16px 20px; border-bottom:1px solid #f1f5f9; align-items:center; cursor:pointer; gap:16px; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <div style="font-weight:700; color:#0f172a; font-size:13px;">${p.visit_date}</div>
                    <div style="font-weight:700; color:#0f172a; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.customer}</div>
                    <div>
                        <div style="font-weight:700; color:#334155; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.machine_model || p.machine_name}</div>
                        <div style="font-size:11px; color:#94a3b8; font-family:monospace;">${p.machine_sn || ''}</div>
                    </div>
                    <div>
                        <span style="padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; color:${condColor}; background:${condColor}20;">${p.overall_condition}</span>
                    </div>
                    <div style="font-size:13px; color:#64748b; line-height:1.4;">${truncatedFindings}</div>
                    <div style="text-align:right;">
                        <span style="font-weight:800; font-size:11px; color:${statColor}; text-transform:uppercase;">${p.status}${ftWarning}</span>
                        <div style="font-size:10px; color:#94a3b8; margin-top:4px;">
                            ${p.customer_email_sent ? '<i class="fas fa-check-circle" style="color:#10b981;"></i> Email Sent' : '<i class="far fa-circle"></i> No Email'}
                        </div>
                    </div>
                </div>`;
            }).join('');

        } catch(e) {
            console.error("PSV Load Error:", e);
            gridBody.innerHTML = `<div style="padding:40px; text-align:center; color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Error loading PSVs: ${e.message}</div>`;
        }
    };

    window.psvOpenLogModal = async function() {
        window._psvState.files = [];
        window._psvState.selectedCustomerMachines = [];
        window.psvGoStep(1);
        
        document.getElementById('psv-add-date').valueAsDate = new Date();
        document.getElementById('psv-add-customer-input').value = '';
        document.getElementById('psv-add-customer-name').value = '';
        document.getElementById('psv-add-customer-frappe-id').value = '';
        document.getElementById('psv-add-machine-input').value = '';
        document.getElementById('psv-add-machine-docname').value = '';
        document.getElementById('psv-add-condition').value = 'Good';
        document.getElementById('psv-add-findings').value = '';
        document.getElementById('psv-add-action-req').checked = false;
        document.getElementById('psv-add-action-notes').value = '';
        document.getElementById('psv-action-notes-wrap').style.display = 'none';
        document.getElementById('psv-machine-group').style.display = 'none';
        document.getElementById('psv-add-machine-preview').style.display = 'none';
        document.getElementById('psv-files-preview').innerHTML = '';
        
        // Reset condition buttons visually
        document.querySelectorAll('.psv-cond-btn').forEach(btn => {
            btn.style.borderColor = '#e2e8f0';
            btn.style.background = 'white';
        });
        document.querySelector('.psv-cond-btn[data-val="Good"]').style.borderColor = '#10b981';
        document.querySelector('.psv-cond-btn[data-val="Good"]').style.background = '#f0fdf4';
        
        document.getElementById('psv-log-modal').style.display = 'flex';

        // Pre-fetch generic dependencies
        if(window._psvState.customers.length === 0 && window.supabase) {
            const {data} = await window.supabase.from('customers').select('customer_name, frappe_id').order('customer_name');
            if(data) window._psvState.customers = data;
        }
        if(window._psvState.machines.length === 0) {
            let all = window._rfAllMachines || window._fmAllMachines;
            if(!all || !all.length) {
                try {
                    const ftBase = 'https://fleetrack.machinery-exchange.com';
                    const res = await window.callFrappeSequenced(ftBase, 'mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register', {});
                    all = res?.data || res?.message?.data || [];
                    window._fmAllMachines = all;
                } catch(e) { all = []; }
            }
            window._psvState.machines = all || [];
        }
    };

    window.psvCloseLogModal = function() {
        document.getElementById('psv-log-modal').style.display = 'none';
    };

    window.psvGoStep = function(stepNum) {
        // Validation before moving forward
        if(stepNum === 2 && window._psvState.step === 1) {
            if(!document.getElementById('psv-add-date').value || !document.getElementById('psv-add-customer-name').value || !document.getElementById('psv-add-machine-docname').value) {
                document.getElementById('psv-error-1').innerText = "Please complete all required fields.";
                document.getElementById('psv-error-1').style.display = 'block';
                return;
            }
            document.getElementById('psv-error-1').style.display = 'none';
        }
        if(stepNum === 3 && window._psvState.step === 2) {
            if(!document.getElementById('psv-add-condition').value || !document.getElementById('psv-add-findings').value.trim()) {
                document.getElementById('psv-error-2').innerText = "Please provide condition and findings.";
                document.getElementById('psv-error-2').style.display = 'block';
                return;
            }
            document.getElementById('psv-error-2').style.display = 'none';
            
            // Populate review step
            document.getElementById('psv-rev-date').innerText = document.getElementById('psv-add-date').value;
            document.getElementById('psv-rev-cust').innerText = document.getElementById('psv-add-customer-name').value;
            document.getElementById('psv-rev-mach').innerText = document.getElementById('psv-add-machine-input').value;
            document.getElementById('psv-rev-cond').innerText = document.getElementById('psv-add-condition').value;
            document.getElementById('psv-rev-act').innerText = document.getElementById('psv-add-action-req').checked ? "YES" : "No";
        }

        window._psvState.step = stepNum;
        document.getElementById('psv-step-1').style.display = stepNum === 1 ? 'flex' : 'none';
        document.getElementById('psv-step-2').style.display = stepNum === 2 ? 'flex' : 'none';
        document.getElementById('psv-step-3').style.display = stepNum === 3 ? 'flex' : 'none';
    };

    window.psvSearchCustomer = function(q) {
        const dd = document.getElementById('psv-customer-dropdown');
        const term = (q || '').toLowerCase().trim();
        const pool = window._psvState.customers;

        if(!pool.length) {
            dd.style.display = 'block';
            dd.innerHTML = '<div style="padding:12px; color:#94a3b8; font-size:13px;">Loading customers...</div>';
            return;
        }

        const filtered = term ? pool.filter(c => c.customer_name.toLowerCase().includes(term)) : pool.slice(0, 50);

        if(!filtered.length) {
            dd.style.display = 'block';
            dd.innerHTML = '<div style="padding:12px; color:#94a3b8; font-size:13px;">No customers found.</div>';
            return;
        }

        dd.style.display = 'block';
        dd.innerHTML = filtered.slice(0, 30).map(c => {
            const safeName = c.customer_name.replace(/'/g, "\\'");
            return `<div onclick="window.psvSelectCustomer('${safeName}', '${c.frappe_id}')" style="padding:10px 16px; cursor:pointer; border-bottom:1px solid #f1f5f9; font-size:13px; font-weight:600; color:#0f172a;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                ${c.customer_name}
            </div>`;
        }).join('');
    };

    window.psvSelectCustomer = function(name, frappeId) {
        document.getElementById('psv-add-customer-input').value = name;
        document.getElementById('psv-add-customer-name').value = name;
        document.getElementById('psv-add-customer-frappe-id').value = frappeId;
        document.getElementById('psv-customer-dropdown').style.display = 'none';

        // Filter machines for this customer
        const nameLower = name.toLowerCase();
        window._psvState.selectedCustomerMachines = window._psvState.machines.filter(m => (m.customer || '').toLowerCase() === nameLower);
        
        // Show machine input
        document.getElementById('psv-machine-group').style.display = 'block';
        document.getElementById('psv-add-machine-input').value = '';
        document.getElementById('psv-add-machine-docname').value = '';
        document.getElementById('psv-add-machine-preview').style.display = 'none';
        
        if(window._psvState.selectedCustomerMachines.length === 0) {
            document.getElementById('psv-add-machine-input').placeholder = "No Fleetrack machines found for this customer...";
        } else {
            document.getElementById('psv-add-machine-input').placeholder = `Search ${window._psvState.selectedCustomerMachines.length} machines...`;
        }
    };

    window.psvShowMachineDropdown = function(q) {
        const dd = document.getElementById('psv-machine-dropdown');
        const term = (q || '').toLowerCase().trim();
        const pool = window._psvState.selectedCustomerMachines;

        if(!pool.length) {
            dd.style.display = 'block';
            dd.innerHTML = '<div style="padding:12px; color:#94a3b8; font-size:13px;">No machines found in Fleetrack for this customer. Please check the customer name.</div>';
            return;
        }

        const filtered = term ? pool.filter(m => 
            (m.model||'').toLowerCase().includes(term) || 
            (m.sn||'').toLowerCase().includes(term) || 
            (m.fleet_no||m.mxg_fleet_no||'').toLowerCase().includes(term)
        ) : pool;

        if(!filtered.length) {
            dd.style.display = 'block';
            dd.innerHTML = '<div style="padding:12px; color:#94a3b8; font-size:13px;">No machines match your search.</div>';
            return;
        }

        dd.style.display = 'block';
        dd.innerHTML = filtered.slice(0, 30).map(m => {
            const modelParts = (m.model||'').split('-');
            const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model||m.name);
            const serial = m.sn || '—';
            const fleet = m.fleet_no || m.mxg_fleet_no || '—';
            const safeDoc = m.name.replace(/'/g, "\\'");
            return `<div onclick="window.psvSelectMachine('${safeDoc}')" style="padding:10px 16px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''">
                <div>
                    <div style="font-weight:700;font-size:13px;color:#0f172a;">${modelCode}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:2px;font-family:monospace;">SN: ${serial} &nbsp;·&nbsp; Fleet: ${fleet}</div>
                </div>
            </div>`;
        }).join('');
    };

    window.psvSelectMachine = function(docname) {
        const m = window._psvState.selectedCustomerMachines.find(x => x.name === docname);
        if(!m) return;
        
        const modelParts = (m.model||'').split('-');
        const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model||m.name);
        const label = `${modelCode} (SN: ${m.sn || '—'})`;

        document.getElementById('psv-add-machine-input').value = label;
        document.getElementById('psv-add-machine-docname').value = docname;
        document.getElementById('psv-machine-dropdown').style.display = 'none';

        // Show preview
        window._psvState.selectedMachineData = m;
        const p = document.getElementById('psv-add-machine-preview');
        p.style.display = 'block';
        p.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div><span style="color:#64748b; font-size:11px; text-transform:uppercase;">Brand</span><br><strong>${m.oem || '-'}</strong></div>
                <div><span style="color:#64748b; font-size:11px; text-transform:uppercase;">Location</span><br><strong>${m.location || '-'}</strong></div>
                <div><span style="color:#64748b; font-size:11px; text-transform:uppercase;">Current HMR</span><br><strong>${m.current_hmr ? m.current_hmr + ' hrs' : '-'}</strong></div>
                <div><span style="color:#64748b; font-size:11px; text-transform:uppercase;">Warranty</span><br><strong>${m.in_warranty ? 'Active' : 'Expired'}</strong></div>
            </div>
        `;
    };

    window.psvSelectCondition = function(cond) {
        document.getElementById('psv-add-condition').value = cond;
        document.querySelectorAll('.psv-cond-btn').forEach(btn => {
            btn.style.borderColor = '#e2e8f0';
            btn.style.background = 'white';
        });
        const activeBtn = document.querySelector(`.psv-cond-btn[data-val="${cond}"]`);
        
        if(cond === 'Good') { activeBtn.style.borderColor = '#10b981'; activeBtn.style.background = '#f0fdf4'; }
        else if(cond === 'Fair') { activeBtn.style.borderColor = '#f59e0b'; activeBtn.style.background = '#fffbeb'; }
        else { activeBtn.style.borderColor = '#ef4444'; activeBtn.style.background = '#fef2f2'; }
    };

    window.psvHandleFileSelect = function(e) {
        const newFiles = Array.from(e.target.files);
        const validFiles = newFiles.filter(f => f.size <= 5 * 1024 * 1024); // 5MB limit
        
        if(newFiles.length !== validFiles.length) {
            alert("Some files were skipped because they exceed the 5MB limit.");
        }
        
        window._psvState.files = [...window._psvState.files, ...validFiles];
        
        // Render preview
        const container = document.getElementById('psv-files-preview');
        container.innerHTML = window._psvState.files.map((f, i) => {
            const isImage = f.type.startsWith('image/');
            const icon = isImage ? '<i class="fas fa-image" style="color:#3b82f6;"></i>' : '<i class="fas fa-file-pdf" style="color:#ef4444;"></i>';
            return `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; display:flex; align-items:center; gap:8px; font-size:12px; color:#0f172a; max-width:200px;">
                ${icon}
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;" title="${f.name}">${f.name}</span>
                <i class="fas fa-times" style="color:#94a3b8; cursor:pointer;" onclick="window.psvRemoveFile(${i})"></i>
            </div>`;
        }).join('');
    };

    window.psvRemoveFile = function(index) {
        window._psvState.files.splice(index, 1);
        // re-render by triggering the handle logic with an empty array
        window.psvHandleFileSelect({target: {files: []}});
    };

    window.submitPsvLog = async function(btn) {
        const errEl = document.getElementById('psv-error-3');
        errEl.style.display = 'none';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        try {
            const date = document.getElementById('psv-add-date').value;
            const customer = document.getElementById('psv-add-customer-name').value;
            const frappeId = document.getElementById('psv-add-customer-frappe-id').value;
            const machineName = document.getElementById('psv-add-machine-docname').value;
            const cond = document.getElementById('psv-add-condition').value;
            const findings = document.getElementById('psv-add-findings').value;
            const actionReq = document.getElementById('psv-add-action-req').checked;
            const actionNotes = document.getElementById('psv-add-action-notes').value;
            
            const m = window._psvState.selectedMachineData || {};
            const modelParts = (m.model||'').split('-');
            const modelCode = modelParts.length > 1 ? modelParts.slice(1).join('-') : (m.model||m.name);

            // 1. Insert DB Record
            const payload = {
                visit_date: date,
                salesperson: (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.user) ? window.CURRENT_SYSTEM.user.full_name : 'Salesperson',
                customer: customer,
                customer_frappe_id: frappeId || null,
                machine_name: machineName,
                machine_model: modelCode,
                machine_sn: m.sn || null,
                machine_fleet_no: m.fleet_no || m.mxg_fleet_no || null,
                machine_oem: m.oem || null,
                machine_location: m.location || null,
                overall_condition: cond,
                findings: findings,
                action_required: actionReq,
                action_notes: actionReq ? actionNotes : null,
                status: 'Submitted'
            };

            const { data: psvData, error: psvErr } = await window.supabase.from('psv_logs').insert([payload]).select().single();
            if(psvErr) throw psvErr;

            // 2. Upload Attachments (if any)
            if(window._psvState.files.length > 0) {
                for(let f of window._psvState.files) {
                    const fileExt = f.name.split('.').pop();
                    const filePath = `${psvData.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    
                    const { error: upErr } = await window.supabase.storage.from('psv-attachments').upload(filePath, f);
                    if(!upErr) {
                        const { data: publicUrlData } = window.supabase.storage.from('psv-attachments').getPublicUrl(filePath);
                        await window.supabase.from('psv_attachments').insert([{
                            psv_id: psvData.id,
                            file_name: f.name,
                            file_url: publicUrlData.publicUrl,
                            file_type: f.type,
                            file_size: f.size
                        }]);
                    } else {
                        console.error("File upload failed:", upErr);
                    }
                }
            }

            // 3. Send Fleetrack Team Email (Simulated via Supabase Edge Function or backend if available)
            // For now, we just mark it as notified if action is required
            if(actionReq) {
                await window.supabase.from('psv_logs').update({
                    fleetrack_notified: true,
                    fleetrack_notified_at: new Date().toISOString()
                }).eq('id', psvData.id);
            }

            // Success - Close log modal and open email draft modal
            window.psvCloseLogModal();
            window.loadPsvList();
            
            // Prepare and show customer email draft
            window.psvOpenCustomerEmail(psvData.id, payload);

        } catch(e) {
            console.error(e);
            errEl.innerText = e.message || "Failed to submit PSV record.";
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Submit PSV';
        }
    };

    window.psvOpenCustomerEmail = function(psvId, data) {
        document.getElementById('psv-em-id').value = psvId;
        
        // Try to guess email from customer data if available in global cache, else blank
        document.getElementById('psv-em-to').value = ''; 
        
        document.getElementById('psv-em-subject').value = `Product Support Visit — ${data.visit_date} — ${data.machine_model}`;
        
        const salesperson = data.salesperson || "Your Representative";
        const actionBlurb = data.action_required ? `\n\nOur technical team has been notified regarding your machine's condition and will be in contact regarding next steps.` : '';
        
        const body = `Dear ${data.customer},\n\nThank you for the opportunity to visit your site on ${data.visit_date}.\n\nDuring our visit, we inspected your ${data.machine_model} (SN: ${data.machine_sn || 'N/A'}).\n\nOverall Condition: ${data.overall_condition}\n\nFindings:\n${data.findings}${actionBlurb}\n\nPlease don't hesitate to reach out if you have any questions.\n\nKind regards,\n${salesperson}\nMachinery Exchange`;
        
        document.getElementById('psv-em-body').value = body;
        document.getElementById('psv-em-error').style.display = 'none';
        
        document.getElementById('psv-email-modal').style.display = 'flex';
    };

    window.psvSendCustomerEmail = async function(btn) {
        const psvId = document.getElementById('psv-em-id').value;
        const to = document.getElementById('psv-em-to').value.trim();
        const subj = document.getElementById('psv-em-subject').value.trim();
        const body = document.getElementById('psv-em-body').value.trim();
        const errEl = document.getElementById('psv-em-error');
        
        if(!to) {
            errEl.innerText = "Please provide an email address.";
            errEl.style.display = 'block';
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            // Ideally call a backend endpoint or edge function to actually send the email here
            // e.g., await window.electron.invoke('send-email', {to, subj, body});
            
            // For now, mark as sent in Supabase
            const { error } = await window.supabase.from('psv_logs').update({
                customer_email_sent: true,
                customer_email_sent_at: new Date().toISOString(),
                customer_email_to: to
            }).eq('id', psvId);

            if(error) throw error;
            
            if(window.omnisLog) window.omnisLog("Customer email logged successfully!", "success");
            
            document.getElementById('psv-email-modal').style.display = 'none';
            window.loadPsvList();

        } catch(e) {
            console.error(e);
            errEl.innerText = "Failed to log email status.";
            errEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Email';
        }
    };

    window.psvOpenDetail = async function(id, dataStr) {
        const p = JSON.parse(dataStr);
        
        document.getElementById('psv-det-customer').innerText = p.customer;
        document.getElementById('psv-det-date').innerText = p.visit_date;
        document.getElementById('psv-det-machine').innerText = p.machine_model || p.machine_name;
        document.getElementById('psv-det-machine-sub').innerText = `SN: ${p.machine_sn || '-'} · Fleet: ${p.machine_fleet_no || '-'}`;
        document.getElementById('psv-det-user').innerText = p.salesperson;
        
        const condEl = document.getElementById('psv-det-condition');
        condEl.innerText = p.overall_condition;
        if(p.overall_condition === 'Good') { condEl.style.background = '#dcfce7'; condEl.style.color = '#166534'; }
        else if(p.overall_condition === 'Fair') { condEl.style.background = '#fef3c7'; condEl.style.color = '#92400e'; }
        else { condEl.style.background = '#fee2e2'; condEl.style.color = '#991b1b'; }
        
        document.getElementById('psv-det-findings').innerText = p.findings || 'No findings recorded.';
        
        const actBlock = document.getElementById('psv-det-action-block');
        if(p.action_required) {
            actBlock.style.display = 'block';
            document.getElementById('psv-det-action-notes').innerText = p.action_notes || 'No specific action noted.';
        } else {
            actBlock.style.display = 'none';
        }
        
        document.getElementById('psv-det-ft-notified').innerText = p.fleetrack_notified ? 'Yes' : (p.action_required ? 'Pending' : 'N/A');
        document.getElementById('psv-det-ft-notified').style.color = p.fleetrack_notified ? '#10b981' : (p.action_required ? '#f59e0b' : '#94a3b8');
        
        document.getElementById('psv-det-cust-notified').innerText = p.customer_email_sent ? 'Sent' : 'Not Sent';
        document.getElementById('psv-det-cust-notified').style.color = p.customer_email_sent ? '#10b981' : '#f59e0b';
        document.getElementById('psv-det-cust-email').innerText = p.customer_email_to || '';

        // Fetch attachments
        const attContainer = document.getElementById('psv-det-attachments');
        attContainer.innerHTML = '<div style="font-size:12px; color:#94a3b8;">Loading attachments...</div>';
        
        document.getElementById('psv-detail-backdrop').style.display = 'block';
        setTimeout(() => {
            document.getElementById('psv-detail-panel').style.display = 'flex';
            document.getElementById('psv-detail-panel').style.transform = 'translateX(0)';
        }, 10);

        try {
            const { data: atts } = await window.supabase.from('psv_attachments').select('*').eq('psv_id', id);
            if(!atts || atts.length === 0) {
                attContainer.innerHTML = '<div style="font-size:13px; color:#64748b; font-style:italic;">No attachments provided.</div>';
            } else {
                attContainer.innerHTML = atts.map(a => {
                    const isImg = a.file_type && a.file_type.startsWith('image/');
                    const icon = isImg ? 'fa-image' : 'fa-file-pdf';
                    const color = isImg ? '#3b82f6' : '#ef4444';
                    return `
                    <a href="${a.file_url}" target="_blank" style="text-decoration:none; display:flex; align-items:center; gap:12px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; transition:0.2s;" onmouseover="this.style.background='white'; this.style.borderColor='#cbd5e1'" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0'">
                        <div style="background:${color}15; width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:${color}; font-size:16px;">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div style="flex:1; overflow:hidden;">
                            <div style="font-size:13px; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.file_name}</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">${Math.round(a.file_size/1024)} KB</div>
                        </div>
                        <i class="fas fa-external-link-alt" style="color:#cbd5e1; font-size:12px;"></i>
                    </a>`;
                }).join('');
            }
        } catch(e) {
            attContainer.innerHTML = '<div style="font-size:12px; color:#ef4444;">Failed to load attachments.</div>';
        }
    };

    window.psvCloseDetail = function() {
        document.getElementById('psv-detail-panel').style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.getElementById('psv-detail-panel').style.display = 'none';
            document.getElementById('psv-detail-backdrop').style.display = 'none';
        }, 300);
    };

