window.salestrack = {

    showToast: function(msg, type) {
        console.log('[Toast] ' + type + ': ' + msg);
        alert(msg);
    },
    
    // We need some fallback properties
    _migrationRunning: false,
    _migrationPaused: false,
    _migrationStartTime: null,
    _migrationTotal: 0,
    _migrationSyncedCount: 0,
    _migrationFailedCount: 0,
    async loadEmailRecipients() {
            try {
                const defs  = this._defaultEmailRecipients();
                let saved = {};
                
                try {
                    const queryFn = window.electron ? window.electron.invoke : null;
                    if (queryFn) {
                        const res = await queryFn('supabase:query', {
                            table: 'omnis_app_settings',
                            method: 'select',
                            params: { match: { setting_key: 'email_recipients' } }
                        });
                        if (res && res.data && res.data.length > 0) saved = res.data[0].setting_value || {};
                        else saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
                    } else if (window.supabase) {
                        const { data } = await window.supabase.from('omnis_app_settings').select('setting_value').eq('setting_key', 'email_recipients');
                        if (data && data.length > 0) saved = data[0].setting_value || {};
                        else saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
                    } else {
                        saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
                    }
                } catch (err) {
                    console.error('Error fetching settings from Supabase, using local:', err);
                    saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
                }
                
                const mxgData = Array.isArray(saved.mxg) ? { cc: saved.mxg, contactName: defs.mxg.contactName, contactTitle: defs.mxg.contactTitle, contactEmail: defs.mxg.contactEmail, contactPhone: defs.mxg.contactPhone } : (saved.mxg || defs.mxg);
                const spzData = Array.isArray(saved.spz) ? { cc: saved.spz, contactName: defs.spz.contactName, contactTitle: defs.spz.contactTitle, contactEmail: defs.spz.contactEmail, contactPhone: defs.spz.contactPhone } : (saved.spz || defs.spz);
    
                const mxgEl = document.getElementById('email-recipients-mxg');
                const spzEl = document.getElementById('email-recipients-spz');
                if (mxgEl) mxgEl.value = mxgData.cc.join('\n');
                if (spzEl) spzEl.value = spzData.cc.join('\n');
                
                if (document.getElementById('email-contact-name-mxg')) document.getElementById('email-contact-name-mxg').value = mxgData.contactName || '';
                if (document.getElementById('email-contact-title-mxg')) document.getElementById('email-contact-title-mxg').value = mxgData.contactTitle || '';
                if (document.getElementById('email-contact-email-mxg')) document.getElementById('email-contact-email-mxg').value = mxgData.contactEmail || '';
                if (document.getElementById('email-contact-phone-mxg')) document.getElementById('email-contact-phone-mxg').value = mxgData.contactPhone || '';
                
                if (document.getElementById('email-contact-name-spz')) document.getElementById('email-contact-name-spz').value = spzData.contactName || '';
                if (document.getElementById('email-contact-title-spz')) document.getElementById('email-contact-title-spz').value = spzData.contactTitle || '';
                if (document.getElementById('email-contact-email-spz')) document.getElementById('email-contact-email-spz').value = spzData.contactEmail || '';
                if (document.getElementById('email-contact-phone-spz')) document.getElementById('email-contact-phone-spz').value = spzData.contactPhone || '';
            } catch(e) { console.error('loadEmailRecipients', e); }
        },

    async saveEmailRecipients() {
            try {
                const mxgEl = document.getElementById('email-recipients-mxg');
                const spzEl = document.getElementById('email-recipients-spz');
                
                const mxg = {
                    cc: mxgEl ? mxgEl.value.split('\n').map(e => e.trim()).filter(Boolean) : [],
                    contactName: document.getElementById('email-contact-name-mxg') ? document.getElementById('email-contact-name-mxg').value.trim() : '',
                    contactTitle: document.getElementById('email-contact-title-mxg') ? document.getElementById('email-contact-title-mxg').value.trim() : '',
                    contactEmail: document.getElementById('email-contact-email-mxg') ? document.getElementById('email-contact-email-mxg').value.trim() : '',
                    contactPhone: document.getElementById('email-contact-phone-mxg') ? document.getElementById('email-contact-phone-mxg').value.trim() : ''
                };
                
                const spz = {
                    cc: spzEl ? spzEl.value.split('\n').map(e => e.trim()).filter(Boolean) : [],
                    contactName: document.getElementById('email-contact-name-spz') ? document.getElementById('email-contact-name-spz').value.trim() : '',
                    contactTitle: document.getElementById('email-contact-title-spz') ? document.getElementById('email-contact-title-spz').value.trim() : '',
                    contactEmail: document.getElementById('email-contact-email-spz') ? document.getElementById('email-contact-email-spz').value.trim() : '',
                    contactPhone: document.getElementById('email-contact-phone-spz') ? document.getElementById('email-contact-phone-spz').value.trim() : ''
                };
                
                const settingsVal = { mxg, spz };
                
                try {
                    const queryFn = window.electron ? window.electron.invoke : null;
                    if (queryFn) {
                        await queryFn('supabase:query', {
                            table: 'omnis_app_settings',
                            method: 'upsert',
                            data: { setting_key: 'email_recipients', setting_value: settingsVal }
                        });
                    } else if (window.supabase) {
                        await window.supabase.from('omnis_app_settings').upsert({ setting_key: 'email_recipients', setting_value: settingsVal });
                    }
                } catch(e) {
                    console.error('Error saving to Supabase:', e);
                }
                
                localStorage.setItem('omnis_email_recipients', JSON.stringify(settingsVal));
                this.showToast('Email recipients saved', 'success');
            } catch(e) { this.showToast('Failed to save recipients', 'error'); }
        },

    resetEmailRecipients() {
            const defs  = this._defaultEmailRecipients();
            const mxgEl = document.getElementById('email-recipients-mxg');
            const spzEl = document.getElementById('email-recipients-spz');
            if (mxgEl) mxgEl.value = defs.mxg.cc.join('\n');
            if (spzEl) spzEl.value = defs.spz.cc.join('\n');
            
            if (document.getElementById('email-contact-name-mxg')) document.getElementById('email-contact-name-mxg').value = defs.mxg.contactName;
            if (document.getElementById('email-contact-title-mxg')) document.getElementById('email-contact-title-mxg').value = defs.mxg.contactTitle;
            if (document.getElementById('email-contact-email-mxg')) document.getElementById('email-contact-email-mxg').value = defs.mxg.contactEmail;
            if (document.getElementById('email-contact-phone-mxg')) document.getElementById('email-contact-phone-mxg').value = defs.mxg.contactPhone;
            
            if (document.getElementById('email-contact-name-spz')) document.getElementById('email-contact-name-spz').value = defs.spz.contactName;
            if (document.getElementById('email-contact-title-spz')) document.getElementById('email-contact-title-spz').value = defs.spz.contactTitle;
            if (document.getElementById('email-contact-email-spz')) document.getElementById('email-contact-email-spz').value = defs.spz.contactEmail;
            if (document.getElementById('email-contact-phone-spz')) document.getElementById('email-contact-phone-spz').value = defs.spz.contactPhone;
            
            this.saveEmailRecipients();
        },

    _defaultEmailRecipients() {
            return {
                mxg: {
                    cc: [
                        'takunda@industrial-exchange.group', 'antony@industrial-exchange.group',
                        'isaac@machinery-exchange.com', 'mathew@industrial-exchange.group',
                        'barry@industrial-exchange.group', 'nolan@industrial-exchange.group',
                        'brendan@industrial-exchange.group'
                    ],
                    contactName: 'Chetan Samji',
                    contactTitle: 'Commercial Manager',
                    contactEmail: 'chetan.samji@machinery-exchange.com',
                    contactPhone: '+263772949515'
                },
                spz: {
                    cc: [
                        'takunda@industrial-exchange.group', 'antony@industrial-exchange.group',
                        'logistics@sinopower.co.zw', 'brett@sinopower.co.zw', 'trucks@sinopower.co.zw',
                        'rutendo@industrial-exchange.group', 'louis@industrial-exchange.group',
                        'mathew@industrial-exchange.group', 'barry@industrial-exchange.group',
                        'brendan@industrial-exchange.group'
                    ],
                    contactName: 'Brett Berry',
                    contactTitle: 'Commercial Manager',
                    contactEmail: 'brett@sinopower.co.zw',
                    contactPhone: '+263775553862'
                }
            };
        },

    async startFullMigration() {
            if (this._migrationRunning) {
                this._migrationPaused = false;
                this.updateMigrationUI("Resuming...");
                return;
            }
    
            const btnStart = document.getElementById('btn-start-migration');
            const btnPause = document.getElementById('btn-pause-migration');
            const pill = document.getElementById('migration-status-pill');
    
            try {
                this._migrationRunning = true;
                this._migrationPaused = false;
                this._migrationStartTime = Date.now();
                this._migrationSyncedCount = 0;
                this._migrationFailedCount = 0;
    
                if (btnStart) { btnStart.disabled = true; btnStart.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING...'; }
                if (btnPause) { btnPause.disabled = false; btnPause.style.cursor = 'pointer'; }
                if (pill) { pill.innerText = "In Progress"; pill.style.background = "#dcfce7"; pill.style.color = "#166534"; }
    
                this.updateMigrationUI("Initializing Connection...");
    
                // 1. Get Total Count
                const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };
                const countRes = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_orders", { start: 0, page_length: 1 });
                const total = countRes.message?.total_count || 4500; // Fallback
                this._migrationTotal = total;
    
                const totalEl = document.getElementById('migration-stat-total');
                if (totalEl) totalEl.innerText = total.toLocaleString();
    
                // 2. Loop Batches
                let offset = 0;
                const batchSize = 50;
    
                while (offset < total) {
                    if (this._migrationPaused) {
                        this.updateMigrationUI("Paused");
                        break;
                    }
    
                    const batchLabel = document.getElementById('migration-batch-label');
                    if (batchLabel) batchLabel.innerText = `Batch ${Math.floor(offset / batchSize) + 1} / ${Math.ceil(total / batchSize)}`;
    
                    // Fetch Batch
                    this.updateMigrationUI(`Fetching records ${offset} to ${offset + batchSize}...`);
                    const batchRes = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_orders", {
                        start: offset,
                        page_length: batchSize
                    });
    
                    const orders = batchRes.message?.data || [];
                    if (orders.length === 0) break;
    
                    // Sync each order in batch
                    for (const order of orders) {
                        if (this._migrationPaused) break;
    
                        try {
                            const detailRes = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_order_details", {
                                report_id: order.name
                            });
    
                            if (detailRes.message?.ok) {
                                await this.syncToSupabase(order.name, {
                                    status: detailRes.message.data.status,
                                    customer_id: detailRes.message.data.customer_name,
                                    owner: detailRes.message.data.owner,
                                    company: detailRes.message.data.company,
                                    contacts: detailRes.message.data.contacts || [],
                                    machines: detailRes.message.data.machines || []
                                });
                                this._migrationSyncedCount++;
                            } else {
                                this._migrationFailedCount++;
                            }
                        } catch (err) {
                            console.error("Batch item sync failed", err);
                            this._migrationFailedCount++;
                        }
    
                        // Update Progress UI
                        this.refreshMigrationProgress(offset + orders.indexOf(order) + 1, total);
                    }
    
                    offset += batchSize;
                    await new Promise(r => setTimeout(r, 1000)); // Delay
                }
    
                if (!this._migrationPaused) {
                    this.updateMigrationUI("Migration Complete!");
                    if (pill) { pill.innerText = "Completed"; pill.style.background = "#10b981"; pill.style.color = "white"; }
                }
    
            } catch (e) {
                console.error("Migration Fatal Error", e);
                this.updateMigrationUI("Fatal Error: " + e.message);
            } finally {
                this._migrationRunning = false;
                if (btnStart) { btnStart.disabled = false; btnStart.innerHTML = '<i class="fas fa-play"></i> START HISTORICAL SYNC'; }
            }
        },

    pauseMigration() {
            this._migrationPaused = true;
            const pill = document.getElementById('migration-status-pill');
            if (pill) { pill.innerText = "Paused"; pill.style.background = "#fef9c3"; pill.style.color = "#854d0e"; }
        },

    updateMigrationUI(msg) {
            const detail = document.getElementById('migration-detail-text');
            if (detail) detail.innerText = msg;
        },

    refreshMigrationProgress(current, total) {
            const pct = Math.floor((current / total) * 100);
            const bar = document.getElementById('migration-progress-bar');
            const pctText = document.getElementById('migration-percent');
            const syncedStat = document.getElementById('migration-stat-synced');
            const failedStat = document.getElementById('migration-stat-failed');
            const etaText = document.getElementById('migration-eta');
    
            if (bar) bar.style.width = pct + '%';
            if (pctText) pctText.innerText = pct + '%';
            if (syncedStat) syncedStat.innerText = this._migrationSyncedCount.toLocaleString();
            if (failedStat) failedStat.innerText = this._migrationFailedCount.toLocaleString();
    
            const elapsed = (Date.now() - this._migrationStartTime) / 1000;
            const rate = current / elapsed;
            if (rate > 0) {
                const remaining = total - current;
                const secondsLeft = Math.round(remaining / rate);
                const h = Math.floor(secondsLeft / 3600);
                const m = Math.floor((secondsLeft % 3600) / 60);
                const s = secondsLeft % 60;
                if (etaText) etaText.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
        },

    async syncToSupabase(reportId, params) {
            if (!window.supabase) return;
            try {
                console.log("[Supabase] Syncing Order...", reportId);
    
                // 1. Upsert Parent
                // Intelligent Company Mapping
                const rawOwner = (params.owner || "").toLowerCase();
                const rawCompany = (params.company || "").toLowerCase();
                let companyTag = "Sinopower"; // Default
                if (rawOwner.includes("machinery") || rawCompany.includes("machinery")) {
                    companyTag = "Machinery Exchange";
                } else if (rawOwner.includes("sinopower") || rawCompany.includes("sinopower")) {
                    companyTag = "Sinopower";
                }
    
                // Fetch the ID because upsert proxy doesn't support onConflict chaining
                const getRes = await window.supabase.from('fmb_reports').select('id, frappe_id');
                const parentRow = (getRes && getRes.data) ? getRes.data.find(r => r.frappe_id === reportId) : null;
                
                const parentPayload = {
                    frappe_id: reportId,
                    status: params.status,
                    is_payment_terms: params.is_payment_terms === true,
                    customer_id: params.customer_id || (this.data && this.data.customer_name),
                    company: companyTag
                };
    
                if (parentRow && parentRow.id) {
                    parentPayload.id = parentRow.id;
                }
    
                const upsertRes = await window.supabase.from('fmb_reports').upsert(parentPayload);
    
                if (upsertRes.error) {
                    console.error("Supabase Parent Sync Error:", upsertRes.error);
                    throw new Error(`Supabase Error: ${upsertRes.error.message || upsertRes.error.details}`);
                }
    
                let supaParentId = parentRow ? parentRow.id : null;
                if (!supaParentId) {
                    // If it was a fresh insert, we need to fetch the generated ID
                    const freshRes = await window.supabase.from('fmb_reports').select('id, frappe_id');
                    const freshRow = freshRes.data ? freshRes.data.find(r => r.frappe_id === reportId) : null;
                    if (freshRow) supaParentId = freshRow.id;
                }
    
                if (!supaParentId) {
                    throw new Error("Supabase accepted the request but could not retrieve the ID.");
                }
    
                // 2. Sync Machines
                if (params.machines && params.machines.length > 0) {
                    const machinesRes = await window.supabase.from('order_machines').select('id, frappe_row_id');
                    const existingMachines = machinesRes.data || [];
    
                    const machinePayloads = params.machines.map(m => {
                        const existing = existingMachines.find(em => em.frappe_row_id === m.name);
                        const payload = {
                            order_id: supaParentId,
                            frappe_row_id: m.name,
                            item_code: m.item,
                            serial_no: m.serial_no,
                            quantity: m.qty || 1,
                            target_date: m.target_handover_date || null,
                            revised_date: m.revised_handover_date || null,
                            notes: m.notes,
                            image_1_url: m.images_one,
                            image_2_url: m.image_two
                        };
                        if (existing && existing.id) payload.id = existing.id;
                        return payload;
                    });
                    await window.supabase.from('order_machines').upsert(machinePayloads);
                }
    
                // 3. Sync Contacts (Batch Insert/Replace approach)
                if (params.contacts && params.contacts.length > 0) {
                    const contactPayloads = params.contacts.map(c => ({
                        order_id: supaParentId,
                        salutation: c.salutation,
                        name: c.name1 || c.name,
                        phone: c.phone_number,
                        email: c.email_address
                    }));
                    await window.supabase.from('order_contacts').insert(contactPayloads);
                }
    
                console.log("[Supabase] Sync Complete.");
            } catch (e) {
                console.error("[Supabase] Sync failed:", e);
            }
        }
    
    
        showToast(msg, type = 'success') {
            let toast = document.getElementById('dash-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'dash-toast';
                toast.style.cssText = `
                    position: fixed; bottom: 20px; right: 20px; z-index: 99999;
                    background: #1e293b; color: white; padding: 12px 24px;
                    border-radius: 8px; font-size: 14px; font-weight: 600;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    opacity: 0; transform: translateY(20px); transition: all 0.3s ease;
                `;
                document.body.appendChild(toast);
            }
    
            toast.textContent = msg;
            toast.style.background = type === 'error' ? '#ef4444' : '#10b981';
    
            // Show
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            });
    
            // Hide after 3s
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(20px)';
            }, 3000);
        }
    
        saveOrderDetails(reportId, machineId) {
            const status = document.getElementById('edit-order-status').value;
            const revised = document.getElementById('edit-order-revised').value;
            const notes = document.getElementById('edit-order-notes').value;
    
            // Indicate loading
            const btn = document.querySelector('button[onclick*="saveOrderDetails"]');
            if (btn) { btn.textContent = "Saving..."; btn.disabled = true; }
    
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : null;
            const baseUrl = sys ? sys.baseUrl : "https://salestrack.powerstar.co.zw";
    
            window.callFrappeSequenced(baseUrl, 'powerstar_salestrack.omnis_dashboard.update_order_details', {
                report_id: reportId,
                machine_id: machineId,
                status: status,
                revised_handover: revised || null,
                notes: notes
            }).then(r => {
                const res = r.message || r;
                if (res.ok) {
                    this.showToast("Order Updated", "success");
                    this.closeListModal();
    
                    // Refresh Data without reload
                    const refreshBtn = document.getElementById('ol-refresh-btn');
                    if (refreshBtn) refreshBtn.click();
                    else if (window.loadOrdersList) window.loadOrdersList(true);
    
                } else {
                    if (res.exc_type === "PermissionError") {
                        this.showToast("Permission Error (Restart Server)", "error");
                        alert("System Update Required: Server restart pending.");
                    } else {
                        this.showToast("Error: " + (res.error || "Unknown"), "error");
                    }
                    if (btn) { btn.textContent = "Save Changes"; btn.disabled = false; }
                }
            }).catch(e => {
                console.error(e);
                this.showToast("Connection Failed", "error");
                if (btn) { btn.textContent = "Save Changes"; btn.disabled = false; }
            });
        }
        // --- DELETE LOGIC ---
        toggleDeleteConfirm(show) {
            const box = document.getElementById('delete-confirm-box');
            const btn = document.getElementById('btn-init-delete');
            if (box) box.style.display = show ? 'block' : 'none';
            if (btn) btn.style.opacity = show ? '0.5' : '1';
        }
    
        async confirmDeleteOrder(reportId) {
            this.showToast("Deleting Order...", "error"); // Orange/Red toast
    
            try {
                if (reportId.startsWith('TRACK-')) {
                    const actualId = reportId.replace('TRACK-', '');
                    if (window.electron) {
                        const res = await window.electron.invoke('supabase:query', {
                            table: 'omnis_tracking_orders',
                            method: 'delete',
                            params: { id: actualId }
                        });
                        if (res && res.ok !== false) {
                            this.showToast("Tracking Order Deleted", "success");
                            this.closeListModal();
                            const refreshBtn = document.getElementById('ol-refresh-btn');
                            if (refreshBtn) refreshBtn.click();
                            else if (window.loadOrdersList) window.loadOrdersList(true);
                            return;
                        } else {
                            throw new Error(res?.error || "Failed to delete tracking order");
                        }
                    }
                }
    
                const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };
    
                const res = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.delete_order", {
                    report_id: reportId
                });
    
                const payload = res.message || res;
    
                if (payload.ok || (payload.error && payload.error.includes("Record not found"))) {
                    // Delete the linked tracking order in Supabase
                    if (window.electron) {
                        try {
                            await window.electron.invoke('supabase:query', {
                                table: 'omnis_tracking_orders',
                                method: 'delete',
                                params: { match: { linked_sale_name: reportId } }
                            });
                        } catch (e) {
                            console.warn("Failed to delete linked tracking order from Supabase:", e);
                        }
                    }
                    
                    this.showToast("Order Deleted Permanently", "success");
                    this.closeListModal();
                    // Refresh
                    const refreshBtn = document.getElementById('ol-refresh-btn');
                    if (refreshBtn) refreshBtn.click();
                    else if (window.loadOrdersList) window.loadOrdersList(true);
                } else {
                    throw new Error(payload.error || "Delete Failed");
                }
            } catch (e) {
                console.error("Delete Error", e);
                this.showToast("Delete Failed: " + e.message, "error");
            }
        }
    
        setupInlineEditing() {
            document.addEventListener('dblclick', (e) => {
                const cell = e.target.closest('.mxg-body-p3 td[data-editable="true"]');
                if (!cell) return;
    
                // Check if already editing
                if (cell.querySelector('.inline-editor')) return;
    
                const row = cell.closest('tr');
                if (!row) return;
    
                const field = cell.dataset.field;
                const currentVal = cell.textContent.trim();
                // Clean value for input
                const cleanVal = currentVal === '-' ? '' : currentVal;
    
                cell.dataset.original = currentVal;
    
                let inputHtml = '';
    
                if (field === 'status') {
                    inputHtml = `
                        <select class="inline-editor" style="width:100%; padding:4px; font-size:11px; border:1px solid #3b82f6; border-radius:4px; outline:none;" onblur="salestrack.saveInlineEdit(this)">
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Handed Over">Handed Over</option>
                            <option value="Draft">Draft</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    `;
                } else if (field === 'target_handover' || field === 'revised_handover') {
                    inputHtml = `<input type="date" class="inline-editor" value="${cleanVal}" style="width:100%; padding:4px; font-size:11px; border:1px solid #3b82f6; border-radius:4px; outline:none;" onblur="salestrack.saveInlineEdit(this)" onkeydown="if(event.key==='Enter') this.blur()">`;
                } else {
                    inputHtml = `<textarea class="inline-editor" rows="3" style="width:100%; padding:4px; font-size:11px; border:1px solid #3b82f6; border-radius:4px; outline:none; resize:vertical;" onblur="salestrack.saveInlineEdit(this)">${cleanVal}</textarea>`;
                }
    
                cell.innerHTML = inputHtml;
    
                const input = cell.querySelector('.inline-editor');
                if (input) {
                    if (input.tagName === 'SELECT') {
                        input.value = cleanVal || 'In Progress';
                    }
                    input.focus();
                }
            });
        }
    
        async saveInlineEdit(input) {
            if (!input) return;
            const cell = input.closest('td');
            const row = cell.closest('tr');
            if (!cell || !row) return;
    
            const reportId = row.getAttribute('data-report-id');
            const machineId = row.getAttribute('data-machine-id');
            const field = cell.dataset.field;
            let newValue = input.value;
            const originalValue = cell.dataset.original;
    
            if (newValue === originalValue || (newValue === '' && originalValue === '-')) {
                cell.innerHTML = originalValue;
                return;
            }
    
            cell.innerHTML = '<span style="color:#3b82f6; font-style:italic;">Saving...</span>';
    
            try {
                const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };
    
                const params = {
                    report_id: reportId,
                    machine_id: machineId
                };
    
                if (field === 'status') params.status = newValue;
                else if (field === 'notes') params.notes = newValue;
                else if (field === 'target_handover') params.target_handover = newValue;
                else if (field === 'revised_handover') params.revised_handover = newValue;
    
                if (reportId && reportId.startsWith('TRACK-')) {
                    const dbId = reportId.replace('TRACK-', '');
                    const updateData = {};
                    
                    if (field === 'status') updateData.status = newValue;
                    else if (field === 'notes') updateData.notes = newValue;
                    else if (field === 'target_handover') updateData.target_handover = newValue || null;
                    else if (field === 'revised_handover') updateData.revised_handover = newValue || null;
                    else if (field === 'actual_handover') updateData.actual_handover = newValue || null;
    
                    if (window.electron) {
                        const updateRes = await window.electron.invoke('supabase:query', {
                            table: 'omnis_tracking_orders',
                            method: 'update',
                            params: { data: updateData, id: dbId }
                        });
                        
                        if (!updateRes.ok) throw new Error("Supabase Update Failed: " + (updateRes.error || "Unknown"));
                    }
                    
                    cell.textContent = newValue || '-';
                    this.showToast("Saved", "success");
    
                    if (field === 'target_handover' || field === 'revised_handover' || field === 'status') {
                        setTimeout(() => {
                            const refreshBtn = document.getElementById('ol-refresh-btn');
                            if (refreshBtn) refreshBtn.click();
                            else if (window.loadOrdersList) window.loadOrdersList(true);
                        }, 500);
                    }
                    return;
                }
    
                const res = await window.callFrappeSequenced(sys.baseUrl, 'powerstar_salestrack.omnis_dashboard.update_order_details_v2', params);
    
                const payload = res.message || res;
    
                if (payload.ok) {
                    cell.textContent = newValue || '-';
                    this.showToast("Saved", "success");
    
                    if (field === 'target_handover' || field === 'revised_handover' || field === 'status') {
                        setTimeout(() => {
                            const refreshBtn = document.getElementById('mxg-refresh-btn');
                            if (refreshBtn) refreshBtn.click();
                        }, 500);
                    }
                } else {
                    throw new Error(payload.error || "Unknown Error");
                }
    
            } catch (e) {
                console.error("Inline Save Error", e);
                if (typeof cell !== 'undefined' && typeof originalValue !== 'undefined') {
                    cell.innerHTML = originalValue;
                }
                this.showToast("Save Failed", "error");
            }
        }
    
        saveSettings() {
            const key = document.getElementById('settings-openai-key').value;
            const msgEl = document.getElementById('settings-status-msg');
    
            try {
                localStorage.setItem('omnis_openai_key', key);
                this.updateSettingsStatus('... Settings saved successfully!', 'success');
                this.showToast("Settings Saved", "success");
            } catch (e) {
                console.error("Save Settings Error", e);
                this.updateSettingsStatus('&#x274C; Failed to save settings.', 'error');
            }
        }
    
        loadSettings() {
            try { this.loadEmailRecipients(); } catch(e) {}
            const key = localStorage.getItem('omnis_openai_key');
            const input = document.getElementById('settings-openai-key');
            if (input && key) {
                input.value = key;
            }
    
            // --- ADMIN ONLY SECTION VISIBILITY ---
            const adminLogs = document.getElementById('settings-admin-logs-card');
            if (adminLogs) {
                const user = (typeof frappe !== "undefined" && frappe.session && frappe.session.user) ? frappe.session.user : "Guest";
                adminLogs.style.display = (user === "Administrator") ? "block" : "none";
            }
    
            // --- API HEALTH UI ---
            window.updateApiMetricsUI = () => this.updateApiMetricsUI();
            this.updateApiMetricsUI();
        }
    
        async fetchErrorLogs() {
            const container = document.getElementById('settings-logs-container');
            if (!container) return;
    
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Fetching system logs...</div>';
    
            try {
                const sys = window.CURRENT_SYSTEM;
                const res = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_error_logs", { limit: 30 });
    
                if (res.message && res.message.ok) {
                    this.renderErrorLogs(res.message.logs);
                } else {
                    container.innerHTML = `<div style="padding:20px; color:#ef4444; font-size:13px; text-align:center;">${res.message ? res.message.error : 'Failed to fetch logs'}</div>`;
                }
            } catch (e) {
                console.error("Fetch Error Logs failed:", e);
                container.innerHTML = `<div style="padding:20px; color:#ef4444; font-size:13px; text-align:center;">Connection Error: ${e.message}</div>`;
            }
        }
    
        renderErrorLogs(logs) {
            const container = document.getElementById('settings-logs-container');
            if (!container) return;
    
            if (!logs || logs.length === 0) {
                container.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">No error logs found. System is healthy! ...</div>';
                return;
            }
    
            container.innerHTML = logs.map(l => {
                const time = l.creation ? l.creation.split('.')[0] : 'Unknown Time';
                const method = l.method || 'Internal System';
                const errMsg = l.error || 'N/A';
                const detail = l.message ? l.message.substring(0, 1000) : '';
    
                return `
                    <div style="padding: 15px; border-bottom: 1px solid #e2e8f0; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 6px;">
                            <span style="color: #4f46e5; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; background: #eef2ff; padding: 2px 8px; border-radius: 4px;">${method}</span>
                            <span style="color: #94a3b8; font-size: 11px; font-weight: 600;">${time}</span>
                        </div>
                        <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px; font-size: 13px;">${errMsg}</div>
                        <div style="color: #64748b; font-size: 11px; white-space: pre-wrap; word-break: break-all; max-height: 100px; overflow-y: auto; padding: 8px; background: #f1f5f9; border-radius: 6px;">${detail}</div>
                    </div>
                `;
            }).join('');
        }
    
        togglePasswordVisibility(inputId) {
            const input = document.getElementById(inputId);
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
            }
        }
    
        async testAIConnection() {
            const key = document.getElementById('settings-openai-key').value.trim();
            const btn = document.getElementById('btn-test-ai-connection');
            const msgEl = document.getElementById('settings-status-msg');
    
            if (!key) {
                this.showToast("Please enter an API key first", "error");
                return;
            }
    
            // Loading state
            const originalBtnContent = btn.innerHTML;
            btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Testing...`;
            btn.disabled = true;
    
            try {
                const res = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + key
                    },
                    body: JSON.stringify({
                        model: "gpt-4.1-mini", // Standard test model
                        messages: [{ role: "user", content: "Ping" }],
                        max_tokens: 5
                    })
                });
    
                const data = await res.json();
    
                if (res.ok) {
                    this.updateSettingsStatus('... Connection successful! Your API key is valid.', 'success');
                    this.showToast("API Key Validated", "success");
                } else {
                    // If it's a 404 model not found, the key itself IS valid, just restricted models.
                    if (data.error && data.error.code === 'model_not_found') {
                        this.updateSettingsStatus('... API key is valid (Model access restricted: ' + (data.error.message || 'model_not_found') + ')', 'success');
                        this.showToast("API Key Validated", "success");
                    } else {
                        const failMsg = data.error ? data.error.message : 'Connection failed.';
                        this.updateSettingsStatus('&#x274C; ' + failMsg, 'error');
                        this.showToast("Connection Failed", "error");
                    }
                }
    
            },

    saveSettings() {
            const key = document.getElementById('settings-openai-key').value;
            const msgEl = document.getElementById('settings-status-msg');
    
            try {
                localStorage.setItem('omnis_openai_key', key);
                this.updateSettingsStatus('... Settings saved successfully!', 'success');
                this.showToast("Settings Saved", "success");
            } catch (e) {
                console.error("Save Settings Error", e);
                this.updateSettingsStatus('&#x274C; Failed to save settings.', 'error');
            }
        },

    togglePasswordVisibility(inputId) {
            const input = document.getElementById(inputId);
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
            }
        },

};
d o c u m e n t . a d d E v e n t L i s t e n e r ( ' D O M C o n t e n t L o a d e d ' ,   ( )   = >   {   i f ( w i n d o w . s a l e s t r a c k . l o a d S t o c k M a p p i n g s )   w i n d o w . s a l e s t r a c k . l o a d S t o c k M a p p i n g s ( ) ;   i f ( w i n d o w . s a l e s t r a c k . l o a d E m a i l R e c i p i e n t s )   w i n d o w . s a l e s t r a c k . l o a d E m a i l R e c i p i e n t s ( ) ;   } ) ;  
 