window.omnisFetchStockCompanyMappings = async function() {
    try {
        if (window.electron) {
            const res = await window.electron.invoke('supabase:query', {
                table: 'stock_company_mappings',
                method: 'select',
                params: {}
            });
            if (res && res.data) {
                window._stockCompanyMappings = res.data;
                return res.data;
            }
        } else if (window.salestrack && window.salestrack.supabase) {
            const { data, error } = await window.salestrack.supabase.from('stock_company_mappings').select('*');
            if (data && !error) {
                window._stockCompanyMappings = data;
                return data;
            }
        }
        return [];
    } catch(e) {
        console.error('Failed to fetch stock company mappings', e);
        return [];
    }
};

window.salestrack = {
    _migrationRunning: false,
    _migrationPaused: false,
    _migrationStartTime: null,
    _migrationTotal: 0,
    _migrationSyncedCount: 0,
    _migrationFailedCount: 0,
    showToast: function(msg, type) { console.log(type+': '+msg); alert(msg); },
    togglePasswordVisibility: function(id) { const el = document.getElementById(id); if(el) el.type = el.type === 'password' ? 'text' : 'password'; },

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

    updateMigrationUI(msg) {
        const detail = document.getElementById('migration-detail-text');
        if (detail) detail.innerText = msg;
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
    },

loadStockMappings: async function() {
    const tbody = document.getElementById('stock-mappings-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#94a3b8; font-style:italic; font-size:13px;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Loading mappings...</td></tr>`;

    try {
        const mappings = await window.omnisFetchStockCompanyMappings();
        
        if (!mappings || mappings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#94a3b8; font-style:italic; font-size:13px;">No mappings found. Add one below.</td></tr>`;
            return;
        }

        let html = '';
        mappings.forEach(m => {
            const isMxg = m.company === 'Machinery Exchange';
            const companyColor = isMxg ? '#2563eb' : '#b91c1c';
            const companyBg = isMxg ? '#eff6ff' : '#fef2f2';
            const logoHtml = m.logo_url ? `<img src="${m.logo_url}" style="height:24px; max-width:80px; object-fit:contain; border-radius:4px;">` : `<span style="color:#cbd5e1; font-size:10px; font-style:italic;">No logo</span>`;
            
            html += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:16px 20px; font-size:14px; font-weight:800; color:#0f172a;">${m.brand}</td>
                    <td style="padding:16px 20px;">
                        <span style="background:${companyBg}; color:${companyColor}; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; border:1px solid ${companyColor}33;">
                            ${m.company}
                        </span>
                    </td>
                    <td style="padding:16px 20px; text-align:center;">
                        ${logoHtml}
                    </td>
                    <td style="padding:16px 20px; text-align:right; display:flex; gap:8px; justify-content:flex-end;">
                        <button onclick="window.salestrack.editStockMapping('${m.brand.replace(/'/g, "\\'")}', '${m.company.replace(/'/g, "\\'")}', '${(m.logo_url || '').replace(/'/g, "\\'")}')" style="padding:6px 12px; background:white; border:1px solid #e2e8f0; border-radius:6px; color:#3b82f6; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#bfdbfe';" onmouseout="this.style.background='white'; this.style.borderColor='#e2e8f0';">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="window.salestrack.deleteStockMapping('${m.brand.replace(/'/g, "\\'")}')" style="padding:6px 12px; background:white; border:1px solid #e2e8f0; border-radius:6px; color:#ef4444; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#fef2f2'; this.style.borderColor='#fecaca';" onmouseout="this.style.background='white'; this.style.borderColor='#e2e8f0';">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    } catch(e) {
        console.error("Error loading stock mappings", e);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#ef4444; font-size:13px;">Failed to load mappings. Check logs.</td></tr>`;
    }
},

addStockMapping: async function() {
    const brandInput = document.getElementById('new-stock-brand');
    const companySelect = document.getElementById('new-stock-company');
    const logoInput = document.getElementById('new-stock-logo');
    
    if (!brandInput || !companySelect) return;
    
    const brandName = brandInput.value.trim();
    const company = companySelect.value;
    const logoUrl = logoInput ? logoInput.value.trim() : '';
    
    if (!brandName) {
        this.showToast ? this.showToast('Please enter a brand name.', 'error') : alert('Please enter a brand name.');
        return;
    }
    
    try {
        let ok = false;
        let errorMsg = '';
        if (window.electron) {
            const res = await window.electron.invoke('supabase:query', {
                table: 'stock_company_mappings',
                method: 'upsert',
                params: {
                    data: {
                        brand: brandName,
                        company: company,
                        logo_url: logoUrl
                    }
                }
            });
            ok = res.ok;
            errorMsg = res.error;
        } else if (window.salestrack && window.salestrack.supabase) {
            const { error } = await window.salestrack.supabase.from('stock_company_mappings').upsert({ brand: brandName, company: company, logo_url: logoUrl }, { onConflict: 'brand' });
            ok = !error;
            errorMsg = error?.message;
        } else {
            throw new Error("No database connection available");
        }
        
        if (!ok) {
            throw new Error(errorMsg || 'Failed to insert mapping');
        }
        
        brandInput.value = ''; // clear input
        if (logoInput) logoInput.value = ''; // clear logo input
        
        // Reset button text if it was changed by editStockMapping
        const btn = document.querySelector('#settings-oem-brands button[onclick*="addStockMapping"]');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-plus"></i> Add Mapping';
        }
        
        this.showToast ? this.showToast('Mapping added/updated successfully.', 'success') : alert('Mapping added/updated successfully.');
        
        // Reload list and update global cache
        await this.loadStockMappings();
        await window.omnisFetchStockCompanyMappings();
        
        // Invalidate stock data cache so distribution is re-evaluated
        if (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.id) {
            localStorage.removeItem("mxg_stock_data_" + window.CURRENT_SYSTEM.id);
        }
        localStorage.removeItem("mxg_stock_pipeline_cache");
        
    } catch(e) {
        console.error("Add mapping error:", e);
        this.showToast ? this.showToast('Error: ' + e.message, 'error') : alert('Error adding mapping: ' + e.message);
    }
},

editStockMapping: function(brand, company, logoUrl) {
    const brandInput = document.getElementById('new-stock-brand');
    const companySelect = document.getElementById('new-stock-company');
    const logoInput = document.getElementById('new-stock-logo');
    
    if (brandInput) {
        brandInput.value = brand;
        brandInput.focus();
    }
    if (companySelect) companySelect.value = company;
    if (logoInput) logoInput.value = logoUrl || '';
    
    // Optional: update button text to show it will update
    const btn = document.querySelector('#settings-oem-brands button[onclick*="addStockMapping"]');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-save"></i> Update Mapping';
    }
},

deleteStockMapping: async function(brand) {
    if (!brand) return;
    
    const confirmDelete = await this.confirm ? await this.confirm('Delete Mapping', 'Are you sure you want to delete this brand mapping?') : confirm('Are you sure you want to delete this mapping?');
    
    if (!confirmDelete) return;
    
    try {
        let ok = false;
        let errorMsg = '';
        if (window.electron) {
            const res = await window.electron.invoke('supabase:query', {
                table: 'stock_company_mappings',
                method: 'delete',
                params: {
                    match: { brand: brand }
                }
            });
            ok = res.ok;
            errorMsg = res.error;
        } else if (window.salestrack && window.salestrack.supabase) {
            const { error } = await window.salestrack.supabase.from('stock_company_mappings').delete().eq('brand', brand);
            ok = !error;
            errorMsg = error?.message;
        } else {
            throw new Error("No database connection available");
        }
        
        if (!ok) {
            throw new Error(errorMsg || 'Failed to delete mapping');
        }
        
        this.showToast ? this.showToast('Mapping deleted.', 'info') : alert('Mapping deleted.');
        
        // Reload list and update global cache
        await this.loadStockMappings();
        await window.omnisFetchStockCompanyMappings();
        
        // Invalidate stock data cache so distribution is re-evaluated
        if (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.id) {
            localStorage.removeItem("mxg_stock_data_" + window.CURRENT_SYSTEM.id);
        }
        
    } catch(e) {
        console.error("Delete mapping error:", e);
        this.showToast ? this.showToast('Error deleting mapping.', 'error') : alert('Error deleting mapping.');
    }
},

};

document.addEventListener('DOMContentLoaded', () => {
    if(window.salestrack.loadStockMappings) window.salestrack.loadStockMappings();
    if(window.salestrack.loadEmailRecipients) window.salestrack.loadEmailRecipients();
});
