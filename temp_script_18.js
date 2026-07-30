
    let currentCdvTab = 'assigned';
    let cdvFilesToUpload = [];

    window.showConfirm = function(message, callback) {
        document.getElementById('omnis-confirm-text').innerText = message;
        document.getElementById('omnis-confirm-modal').style.display = 'flex';
        
        const btnOk = document.getElementById('omnis-confirm-ok');
        const btnCancel = document.getElementById('omnis-confirm-cancel');
        
        const cleanup = () => {
            document.getElementById('omnis-confirm-modal').style.display = 'none';
            btnOk.replaceWith(btnOk.cloneNode(true));
            btnCancel.replaceWith(btnCancel.cloneNode(true));
        };

        btnCancel.onclick = () => { cleanup(); callback(false); };
        btnOk.onclick = () => { cleanup(); callback(true); };
    };

    window.switchCdvTab = function(tabId) {
        currentCdvTab = tabId;
        document.getElementById('cdv-tab-assigned').style.color = tabId === 'assigned' ? '#0f172a' : '#64748b';
        document.getElementById('cdv-tab-assigned').style.borderBottomColor = tabId === 'assigned' ? '#3b82f6' : 'transparent';
        
        document.getElementById('cdv-tab-history').style.color = tabId === 'history' ? '#0f172a' : '#64748b';
        document.getElementById('cdv-tab-history').style.borderBottomColor = tabId === 'history' ? '#3b82f6' : 'transparent';

        document.getElementById('cdv-assigned-view').style.display = tabId === 'assigned' ? 'block' : 'none';
        document.getElementById('cdv-history-view').style.display = tabId === 'history' ? 'block' : 'none';

        if (tabId === 'history') window.loadCdvList();
        if (tabId === 'assigned') window.loadCdvAssigned();
    };

    window.cdvOpenLogModal = async function(scheduleId = '', customerName = '') {
        document.getElementById('cdv-log-modal').style.display = 'flex';
        document.getElementById('cdv-schedule-id').value = scheduleId;
        document.getElementById('cdv-visit-date').valueAsDate = new Date();
        document.getElementById('cdv-topics').value = '';
        document.getElementById('cdv-issues').value = '';
        document.getElementById('cdv-opportunities').value = '';
        document.getElementById('cdv-action-required').checked = false;
        document.getElementById('cdv-action-notes').value = '';
        document.getElementById('cdv-action-notes-container').style.display = 'none';
        cdvFilesToUpload = [];
        window.cdvRenderAttachments();

        const customerSelect = document.getElementById('cdv-customer-select');
        customerSelect.innerHTML = '<option value="">Loading customers...</option>';

        // Fetch customers list
        const res = await window.electron.ipcRenderer.invoke('supabase:query', {
            table: 'customers',
            method: 'select',
            params: { columns: 'customer_name, frappe_id' }
        });

        customerSelect.innerHTML = '<option value="">Select a customer...</option>';
        if (res.ok && res.data) {
            // Sort alphabetically
            const sorted = res.data.sort((a,b) => a.customer_name.localeCompare(b.customer_name));
            sorted.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.frappe_id; // Frappe ID
                opt.textContent = c.customer_name;
                if (c.customer_name === customerName) opt.selected = true;
                customerSelect.appendChild(opt);
            });
        }
    };

    window.cdvCloseLogModal = function() {
        document.getElementById('cdv-log-modal').style.display = 'none';
    };

    window.cdvHandleFilesSelect = function(event) {
        const files = Array.from(event.target.files);
        files.forEach(f => {
            if (f.size > 10 * 1024 * 1024) {
                window.showToast(`File ${f.name} is larger than 10MB.`, 'error');
                return;
            }
            cdvFilesToUpload.push(f);
        });
        window.cdvRenderAttachments();
        event.target.value = '';
    };

    window.cdvRenderAttachments = function() {
        const list = document.getElementById('cdv-attachments-list');
        list.innerHTML = '';
        cdvFilesToUpload.forEach((f, idx) => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#f1f5f9; padding:6px 12px; border-radius:6px; font-size:12px; display:flex; align-items:center; gap:8px; border:1px solid #cbd5e1;';
            div.innerHTML = `
                <i class="fas fa-file-alt" style="color:#64748b;"></i>
                <span style="max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</span>
                <i class="fas fa-times" style="cursor:pointer; color:#ef4444;" onclick="cdvFilesToUpload.splice(${idx},1); window.cdvRenderAttachments();"></i>
            `;
            list.appendChild(div);
        });
    };

    window.cdvSubmitLog = async function() {
        const scheduleId = document.getElementById('cdv-schedule-id').value;
        const visitDate = document.getElementById('cdv-visit-date').value;
        const customerSelect = document.getElementById('cdv-customer-select');
        const customerFrappeId = customerSelect.value;
        const customerName = customerSelect.options[customerSelect.selectedIndex]?.text;
        
        if (!visitDate || !customerFrappeId) return window.showToast('Please provide visit date and customer.', 'warning');

        const btn = document.getElementById('btn-submit-cdv');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        btn.disabled = true;

        try {
            const currentUser = window.globalSessionUser || 'Unknown User';
            
            // Insert log
            const logData = {
                visit_date: visitDate,
                schedule_id: scheduleId || null,
                salesperson: currentUser,
                customer: customerName,
                customer_frappe_id: customerFrappeId,
                topics_discussed: document.getElementById('cdv-topics').value,
                potential_issues: document.getElementById('cdv-issues').value,
                opportunities: document.getElementById('cdv-opportunities').value,
                action_required: document.getElementById('cdv-action-required').checked,
                action_notes: document.getElementById('cdv-action-notes').value,
                status: 'Submitted'
            };

            const insertRes = await window.electron.ipcRenderer.invoke('supabase:query', {
                table: 'cdv_logs',
                method: 'insert',
                data: logData,
                params: { columns: 'id' } // Note: Standard JS wrapper for Supabase returns data
            });

            // Wait, we need the inserted ID to attach files. Due to standard Supabase behavior, insert returns the row if we use .select()
            // We use a modified insert that returns data if supported by our proxy, but if not we can query by timestamp.
            // Let's assume the proxy returns data array on insert if we add .select() 
            // In main.js, upsert/insert doesn't automatically chain .select(), but we can do a quick fetch
            
            let insertedId = null;
            if (insertRes.ok && insertRes.data && insertRes.data.length > 0) {
                insertedId = insertRes.data[0].id;
            } else {
                // Fetch the latest to get ID
                const fetchLatest = await window.electron.ipcRenderer.invoke('supabase:query', {
                    table: 'cdv_logs', method: 'select', params: { order: { column: 'created_at', options: { ascending: false } }, range: {from:0, to:0} }
                });
                if (fetchLatest.ok && fetchLatest.data) insertedId = fetchLatest.data[0].id;
            }

            // Mark schedule as completed if applicable
            if (scheduleId) {
                await window.electron.ipcRenderer.invoke('supabase:query', {
                    table: 'cdv_schedules', method: 'upsert', data: { id: scheduleId, status: 'Completed' }
                });
            }

            // Upload files
            if (insertedId && cdvFilesToUpload.length > 0) {
                for (let f of cdvFilesToUpload) {
                    const arrayBuffer = await f.arrayBuffer();
                    const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                    const filePath = `cdv/${insertedId}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    
                    const uploadRes = await window.electron.ipcRenderer.invoke('storage:upload', {
                        bucket: 'psv-attachments', // Using same bucket or you can create cdv-attachments
                        path: filePath,
                        base64Data: base64,
                        contentType: f.type || 'application/octet-stream'
                    });

                    if (uploadRes.ok) {
                        await window.electron.ipcRenderer.invoke('supabase:query', {
                            table: 'cdv_attachments',
                            method: 'insert',
                            data: { cdv_id: insertedId, file_name: f.name, file_url: uploadRes.url, file_type: f.type, file_size: f.size }
                        });
                    }
                }
            }

            window.cdvCloseLogModal();
            window.loadCdvAssigned();
            window.updateWeeklyTargets();
            window.showToast('Customer Visit logged successfully!', 'success');

        } catch (err) {
            console.error(err);
            window.showToast('Error logging CDV', 'error');
        } finally {
            btn.innerHTML = '<i class="fas fa-check" style="margin-right:6px;"></i> Submit CDV';
            btn.disabled = false;
        }
    };

    window.cdvGenerateSchedule = async function() {
        window.showConfirm("This will find 8 customers you haven't visited recently and assign them to you for this week. Proceed?", async (proceed) => {
        if (!proceed) return;
        
        try {
            const currentUser = window.globalSessionUser || 'Unknown User';
            // Get Monday of current week
            const d = new Date();
            const day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1);
            const monday = new Date(d.setDate(diff));
            const weekStr = monday.toISOString().split('T')[0];

            // 1. Fetch current assignments to see if we already have 8
            const existingRes = await window.electron.ipcRenderer.invoke('supabase:query', {
                table: 'cdv_schedules', method: 'select', 
                params: { match: { salesperson: currentUser, week_start_date: weekStr } }
            });
            const existingCount = existingRes.data ? existingRes.data.length : 0;
            const needed = 8 - existingCount;

            if (needed <= 0) {
                window.showToast("You already have 8 or more customers scheduled for this week.", 'info');
                return;
            }

            // 2. We need `needed` more customers. Grab random or recently unvisited ones.
            const custRes = await window.electron.ipcRenderer.invoke('supabase:query', {
                table: 'customers', method: 'select', params: { columns: 'frappe_id, customer_name', range: {from:0, to: 999} }
            });

            if(!custRes.ok) throw new Error("Failed to load customers");

            // Shuffle randomly to simulate round robin assignment for now
            const shuffled = custRes.data.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, needed);

            for (let c of selected) {
                await window.electron.ipcRenderer.invoke('supabase:query', {
                    table: 'cdv_schedules',
                    method: 'insert',
                    data: { week_start_date: weekStr, salesperson: currentUser, customer: c.customer_name, customer_frappe_id: c.frappe_id, status: 'Scheduled' }
                });
            }

            window.showToast(`Assigned ${needed} customers for this week.`, 'success');
            window.loadCdvAssigned();
            window.updateWeeklyTargets();
        } catch (e) {
            console.error(e);
            window.showToast('Failed to generate schedule.', 'error');
        }
        });
    };

    window.loadCdvAssigned = async function() {
        const grid = document.getElementById('cdv-assigned-grid');
        grid.innerHTML = '<tr><td colspan="3" style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
        
        const currentUser = window.globalSessionUser || 'Unknown User';
        const d = new Date();
        const day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1);
        const monday = new Date(d.setDate(diff));
        const weekStr = monday.toISOString().split('T')[0];

        const res = await window.electron.ipcRenderer.invoke('supabase:query', {
            table: 'cdv_schedules',
            method: 'select',
            params: { match: { salesperson: currentUser, week_start_date: weekStr } }
        });

        if (!res.ok || !res.data || res.data.length === 0) {
            grid.innerHTML = '<tr><td colspan="3" style="padding:40px; text-align:center; color:#94a3b8;">No customers assigned yet this week. Click "Assign 8" to start.</td></tr>';
            return;
        }

        grid.innerHTML = '';
        res.data.forEach(s => {
            const isCompleted = s.status === 'Completed';
            const statusBadge = isCompleted 
                ? `<span style="padding:4px 8px; background:#dcfce7; color:#166534; border-radius:4px; font-size:11px; font-weight:800; text-transform:uppercase;">Completed</span>`
                : `<span style="padding:4px 8px; background:#fef3c7; color:#92400e; border-radius:4px; font-size:11px; font-weight:800; text-transform:uppercase;">Pending</span>`;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; font-weight:700;">${s.customer}</td>
                <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; text-align:center;">${statusBadge}</td>
                <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; text-align:right;">
                    ${isCompleted ? '' : `<button onclick="window.cdvOpenLogModal('${s.id}', '${s.customer}')" style="padding:6px 12px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">Log Visit</button>`}
                </td>
            `;
            grid.appendChild(tr);
        });
    };

    window.loadCdvList = async function() {
        const grid = document.getElementById('cdv-grid');
        grid.innerHTML = '<tr><td colspan="4" style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
        
        const currentUser = window.globalSessionUser || 'Unknown User';
        const res = await window.electron.ipcRenderer.invoke('supabase:query', {
            table: 'cdv_logs',
            method: 'select',
            params: { match: { salesperson: currentUser }, order: { column: 'visit_date', options: { ascending: false } } }
        });

        if (!res.ok || !res.data || res.data.length === 0) {
            grid.innerHTML = '<tr><td colspan="4" style="padding:40px; text-align:center; color:#94a3b8;">No customer visits logged yet.</td></tr>';
            return;
        }

        grid.innerHTML = '';
        res.data.forEach(c => {
            const actionBadge = c.action_required 
                ? `<span style="padding:4px 8px; background:#fee2e2; color:#991b1b; border-radius:4px; font-size:11px; font-weight:800; text-transform:uppercase;"><i class="fas fa-exclamation-triangle"></i> Needs Action</span>`
                : `<span style="padding:4px 8px; background:#f1f5f9; color:#64748b; border-radius:4px; font-size:11px; font-weight:800; text-transform:uppercase;">OK</span>`;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9;">${c.visit_date}</td>
                <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; font-weight:700;">${c.customer}</td>
                <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; text-align:center;">${actionBadge}</td>
                <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; text-align:right;"><button style="padding:6px; background:none; border:none; color:#64748b; cursor:pointer;"><i class="fas fa-eye"></i></button></td>
            `;
            grid.appendChild(tr);
        });
    };

    window.updateWeeklyTargets = async function() {
        try {
            const currentUser = window.globalSessionUser || 'Unknown User';
            const d = new Date();
            const day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1);
            const monday = new Date(d.setDate(diff));
            const weekStr = monday.toISOString().split('T')[0];

            // 1. CDV Targets (from cdv_schedules Completed)
            const cdvRes = await window.electron.ipcRenderer.invoke('supabase:query', {
                table: 'cdv_schedules', method: 'select', 
                params: { match: { salesperson: currentUser, week_start_date: weekStr, status: 'Completed' } }
            });
            const cdvCount = cdvRes.data ? cdvRes.data.length : 0;
            document.getElementById('widget-cdv-count').innerText = cdvCount;
            document.getElementById('widget-cdv-bar').style.width = Math.min(100, (cdvCount / 8) * 100) + '%';
            // Mirror to KPI strip
            const cdvKpi = document.getElementById('dash-kpi-cdv');
            if (cdvKpi) cdvKpi.textContent = cdvCount;

            // 2. PSV Targets (from psv_logs for this week)
            const psvRes = await window.electron.ipcRenderer.invoke('supabase:query', {
                table: 'psv_logs', method: 'select',
                params: { match: { salesperson: currentUser } } // Filter by date client-side to keep it simple
            });
            let psvCount = 0;
            if (psvRes.ok && psvRes.data) {
                psvCount = psvRes.data.filter(p => p.visit_date >= weekStr).length;
            }
            document.getElementById('widget-psv-count').innerText = psvCount;
            document.getElementById('widget-psv-bar').style.width = Math.min(100, (psvCount / 8) * 100) + '%';
            // Mirror to KPI strip
            const psvKpi = document.getElementById('dash-kpi-psv');
            if (psvKpi) psvKpi.textContent = psvCount;

            // 3. Load quotation pipeline counts for KPI strip + pipeline panel
            try {
                const qRes = await window.electron.ipcRenderer.invoke('supabase:query', {
                    table: 'quotations', method: 'select',
                    params: { columns: 'id,status,created_at', options: {} }
                });
                const quotes = qRes.data || [];
                const draft = quotes.filter(q => q.status === 'Draft').length;
                const sent  = quotes.filter(q => ['Sent','Open','Pending'].includes(q.status)).length;
                const won   = quotes.filter(q => ['Won','Confirmed','Order'].includes(q.status)).length;
                const now   = new Date();
                const overdue = quotes.filter(q => {
                    if (!['Sent','Open','Pending'].includes(q.status)) return false;
                    const age = (now - new Date(q.created_at)) / (1000*60*60*24);
                    return age > 30;
                }).length;
                const openTotal = draft + sent;
                const kqEl = document.getElementById('dash-kpi-open-quotes'); if(kqEl) kqEl.textContent = openTotal;
                const pdEl = document.getElementById('dash-pipe-draft');  if(pdEl) pdEl.textContent = draft;
                const psEl = document.getElementById('dash-pipe-sent');   if(psEl) psEl.textContent = sent;
                const pwEl = document.getElementById('dash-pipe-won');    if(pwEl) pwEl.textContent = won;
                const poEl = document.getElementById('dash-pipe-overdue');if(poEl) poEl.textContent = overdue;
            } catch(qe) { console.warn('Pipeline load failed', qe); }

        } catch (e) {
            console.warn("Failed to load targets", e);
        }
    };

    // Initialize CDV when the view is opened
    document.querySelector('.top-nav-dropdown-item[data-view="view-cdv"]').addEventListener('click', () => {
        window.loadCdvAssigned();
    });

    // Hook into dashboard load
    document.querySelector('.sidebar-item[data-view="view-dashboard"]').addEventListener('click', () => {
        window.updateWeeklyTargets();
    });

