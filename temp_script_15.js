
(function() {
    let currentProductId = null;
    let currentFrappeId = null;
    let currentCustomer = null;

    const pricingFields = [
        { id: 'oem_price', label: 'OEM Price (Inc Warranty)' },
        { id: 'foreign_portion_cost', label: 'Port Charges' },
        { id: 'freight_cost', label: 'Delivery Inc Insurance' },
        { id: 'duty_cost', label: 'Duty' },
        { id: 'clearance_cost', label: 'Clearance' },
        { id: 'offload_cost', label: 'Offload' },
        { id: 'offload_pdi_cost', label: 'Assembly, PDI, Mine Spec' },
        { id: 'saferider_cost', label: 'Safe Rider' },
        { id: 'bucket_conversion_cost', label: 'Bucket Conversion' },
        { id: 'fitting_blade_cost', label: 'Fitting Blade' },
        { id: 'first_service_cost', label: 'First Service' },
        { id: 'parts_warranty_cost', label: 'Parts Warranty Allowable' },
        { id: 'warranty_allowable_cost', label: 'Warranty Allowable' }
    ];

    // Generate Input HTML
    function initInputs() {
        const container = document.getElementById('pp-inputs-container');
        if(!container) return;
        
        container.innerHTML = pricingFields.map(f => `
            <div>
                <label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:4px; display:block;">${f.label}</label>
                <input type="number" id="pp-in-${f.id}" value="0" step="0.01" oninput="window.calculateProductPricing()" style="width:100%; padding:10px; border-radius:6px; border:1px solid #e2e8f0; font-size:14px; outline:none; background:#f8fafc; font-weight:600;">
            </div>
        `).join('');
    }

    window.openProductPricing = async function(id, name, brand, frappeId) {
        currentProductId = id;
        currentFrappeId = frappeId;
        
        document.getElementById('pp-title').innerText = name;
        document.getElementById('pp-brand').innerText = brand || 'GENERIC';
        document.getElementById('pp-frappe-id').innerText = frappeId;
        
        // Populate Customers Dropdown
        const custSelect = document.getElementById('pp-customer');
        custSelect.innerHTML = '<option value="">-- Select Customer --</option>';
        try {
            const res = await window.electron.invoke('cache:getAll', 'customers');
            if(res.ok && res.data) {
                // Sort alphabetically
                res.data.sort((a,b) => a.customer_name.localeCompare(b.customer_name));
                res.data.forEach(c => {
                    custSelect.innerHTML += `<option value="${c.frappe_id}">${c.customer_name}</option>`;
                });
            }
        } catch(e) { console.error('Customer load error', e); }

        // Reset fields
        pricingFields.forEach(f => {
            const el = document.getElementById(`pp-in-${f.id}`);
            if(el) el.value = "0";
        });
        document.getElementById('pp-markup').value = "0";
        document.getElementById('pp-recent-grid').innerHTML = '<div style="color:#94a3b8; font-size:12px;">No recent pricing found.</div>';
        document.getElementById('pp-average-grid').innerHTML = '<div style="color:#94a3b8; font-size:12px;">No historical data.</div>';
        document.getElementById('pp-history-table').innerHTML = '<div style="color:#94a3b8; font-style:italic;">Select a customer to view pricing history.</div>';

        window.calculateProductPricing();

        const modal = document.getElementById('product-pricing-overlay');
        modal.style.display = 'flex';
        // Fade in
        modal.style.opacity = '0';
        setTimeout(() => modal.style.opacity = '1', 10);
    };

    window.calculateProductPricing = function() {
        let landed = 0;
        pricingFields.forEach(f => {
            const el = document.getElementById(`pp-in-${f.id}`);
            if(el && el.value) {
                landed += parseFloat(el.value) || 0;
            }
        });

        const markupInput = document.getElementById('pp-markup');
        const markupPct = parseFloat(markupInput.value) || 0;
        
        const retail = landed + (landed * (markupPct / 100));
        let margin = 0;
        if (retail > 0) {
            margin = ((retail - landed) / retail) * 100;
        }

        const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
        
        document.getElementById('pp-summary-landed').innerText = fmt.format(landed);
        document.getElementById('pp-summary-retail').innerText = fmt.format(retail);
        document.getElementById('pp-summary-margin').innerText = margin.toFixed(2) + '%';
        document.getElementById('pp-summary-rounded').innerText = fmt.format(Math.ceil(retail));
    };

    window.loadProductPricingHistory = async function() {
        const custSelect = document.getElementById('pp-customer');
        currentCustomer = custSelect.value;
        if(!currentCustomer) return;

        try {
            // Query Supabase for pricing history for this item + customer
            const res = await window.electron.invoke('supabase:query', {
                table: 'product_pricing',
                method: 'select',
                params: {
                    columns: '*',
                    options: {}
                }
            });

            if(res.ok && res.data) {
                // Filter client side (or server side, but client is fine for desktop)
                const history = res.data.filter(r => r.item === currentFrappeId && r.customer === currentCustomer);
                history.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

                if(history.length > 0) {
                    const last = history[0];
                    renderPastGrid('pp-recent-grid', last, '');
                    renderPastGrid('pp-average-grid', last, '_avg'); // Averages are stored in the latest record
                    
                    if(last.pricing_history_html) {
                        document.getElementById('pp-history-table').innerHTML = last.pricing_history_html;
                    } else {
                        document.getElementById('pp-history-table').innerHTML = '<div style="color:#94a3b8; font-size:12px;">No rich history found.</div>';
                    }
                } else {
                    document.getElementById('pp-recent-grid').innerHTML = '<div style="color:#94a3b8; font-size:12px;">No past pricing found.</div>';
                    document.getElementById('pp-average-grid').innerHTML = '<div style="color:#94a3b8; font-size:12px;">No historical data.</div>';
                    document.getElementById('pp-history-table').innerHTML = '<div style="color:#94a3b8; font-style:italic;">No records yet.</div>';
                }
            }
        } catch(e) { console.error('History load error', e); }
    };

    function renderPastGrid(elemId, data, suffix) {
        const elem = document.getElementById(elemId);
        const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
        
        let html = '';
        pricingFields.forEach(f => {
            const val = data[f.id + suffix] || data[f.id + '_last'] || 0;
            html += `
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:4px;">
                    <span style="font-size:11px; color:#64748b;">${f.label}</span>
                    <span style="font-size:12px; font-weight:700; color:#0f172a;">${fmt.format(val)}</span>
                </div>
            `;
        });
        
        const markup = data['markup_percentage' + suffix] || data['markup_percentage_last'] || 0;
        html += `
            <div style="display:flex; justify-content:space-between; padding-top:4px; font-weight:800;">
                <span style="font-size:11px; color:#ef4444;">MARKUP %</span>
                <span style="font-size:12px; color:#ef4444;">${parseFloat(markup).toFixed(1)}%</span>
            </div>
        `;
        elem.innerHTML = html;
    }

    window.saveProductPricing = async function() {
        if(!currentCustomer) {
            alert('Please select a customer first.');
            return;
        }

        const btn = document.getElementById('pp-save-btn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            // 1. Gather Inputs
            const record = {
                frappe_id: `PP-${Date.now()}`,
                customer: currentCustomer,
                item: currentFrappeId,
                currency_pricing: document.getElementById('pp-currency').value
            };

            let landed = 0;
            pricingFields.forEach(f => {
                const el = document.getElementById(`pp-in-${f.id}`);
                const val = parseFloat(el.value) || 0;
                record[f.id] = val;
                
                // For this demo, since we are creating the first record, we'll map _last and _avg to the same.
                // In production, you'd calculate averages from past records.
                record[f.id + '_last'] = val;
                record[f.id + '_avg'] = val;
                
                landed += val;
            });

            const markupPct = parseFloat(document.getElementById('pp-markup').value) || 0;
            record.markup_percentage = markupPct;
            record.markup_percentage_last = markupPct;
            record.markup_percentage_avg = markupPct;
            record.computed_markup = markupPct;

            const retail = landed + (landed * (markupPct / 100));
            const margin = retail > 0 ? ((retail - landed) / retail) * 100 : 0;
            const rounded = Math.ceil(retail);

            record.rounded_up_price = rounded;
            record.margin_percentage = margin;
            record.landed_cost = landed;
            record.retail_price = retail;

            // Simple HTML log
            const d = new Date().toISOString().split('T')[0];
            const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
            const logEntry = `
                <div style="padding:12px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <div><span style="font-weight:800; color:#0f172a;">${d}</span> <span style="color:#64748b; margin-left:8px;">New pricing saved.</span></div>
                    <div style="font-weight:800; color:#10b981;">${fmt.format(retail)}</div>
                </div>
            `;
            
            // Append to previous HTML if exists
            const prevHtml = document.getElementById('pp-history-table').innerHTML;
            const cleanPrev = prevHtml.includes('Select a customer') ? '' : prevHtml;
            record.pricing_history_html = logEntry + cleanPrev;

            // Save to Supabase
            const res = await window.electron.invoke('supabase:query', {
                table: 'product_pricing',
                method: 'insert',
                data: record
            });

            if(res.ok) {
                if(window.omnisLog) window.omnisLog("Pricing Saved Successfully", "success");
                window.loadProductPricingHistory(); // reload to show new history
            } else {
                throw new Error(res.error);
            }
        } catch(e) {
            console.error(e);
            alert('Save failed: ' + e.message);
        } finally {
            btn.innerHTML = '<i class="fas fa-save"></i> Save Pricing';
            btn.disabled = false;
        }
    };

    // Initialize inputs when document loads
    document.addEventListener('DOMContentLoaded', initInputs);
    // Since we are injecting this dynamically, call initInputs now:
    setTimeout(initInputs, 500);

})();
