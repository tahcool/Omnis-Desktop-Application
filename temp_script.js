  
</body></html>`);
      win.document.close();
    };
    /* ===== END GIFT LIST ===== */

    window.closeGroupSalesForm = function () {
      const overlay = document.getElementById('gs-form-overlay');
      if (overlay) overlay.style.display = "none";
      window._promotingTrackId = null; // Clear if cancelled
      window._forceTrackingPush = false;
    }

    window.pushSaleToTracking = function() {
      window._forceTrackingPush = true;
      window.saveGroupSaleRecord();
    }

    window.saveGroupSaleRecord = async function () {
      const btn = document.getElementById('btn-save-group-sale');
      const originalText = btn.textContent;

      const payload = {
        customer: document.getElementById('gs-customer').value,
        order_date: document.getElementById('gs-order_date').value,
        committed_lead_time: document.getElementById('gs-lead-time').value,
        oem: document.getElementById('gs-oem').value,
        machine_condition: document.getElementById('gs-condition').value,
        model: document.getElementById('gs-model').value,
        qty: document.getElementById('gs-qty').value,
        customer_status: document.getElementById('gs-cust-status').value,
        sector: document.getElementById('gs-sector').value,
        salesperson: document.getElementById('gs-salesperson').value,
        company: document.getElementById('gs-company').value,
        comments: document.getElementById('gs-comments').value
      };

      // 2. Advanced Validation & Highlighting
      clearGsErrors();
      let missing = [];
      const required = ["customer", "order_date", "committed_lead_time", "oem", "model", "qty", "sector", "salesperson", "company"];

      required.forEach(field => {
        if (!payload[field]) {
          // Map payload keys to HTML IDs specifically where they differ
          let id = 'gs-' + field;
          if (field === 'committed_lead_time') id = 'gs-lead-time';

          const inputEl = document.getElementById(id);
          if (inputEl) {
            inputEl.classList.add('gs-input-error');
          }
          missing.push(field);
        }
      });

      if (missing.length > 0) {
        const summary = document.getElementById('gs-error-summary');
        if (summary) summary.classList.remove('hidden');

        const content = document.getElementById('gs-scroll-top');
        if (content) content.scrollTop = 0;

        window._forceTrackingPush = false; // Reset if validation fails
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = "Saving...";

        // --- NEW OEM AUTO-CREATE ---
        if (payload.oem && window.electron) {
            try {
                const { data: bData } = await window.electron.invoke('supabase:query', {
                    table: 'brands', method: 'select', params: { filters: { name: payload.oem } }
                });
                if (!bData || bData.length === 0) {
                    await window.electron.invoke('supabase:query', {
                        table: 'brands', method: 'insert', data: { name: payload.oem }
                    });
                }
            } catch (e) { console.warn("Failed to auto-create brand:", e); }
        }
        // ---------------------------

        if (!CURRENT_SYSTEM) throw new Error("System not connected.");
        const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");

        // Include edit name if in edit mode
        if (window._editingGroupSaleName) {
          payload.name = window._editingGroupSaleName;
        }

        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.save_group_sales", payload);
        const response = res.message || res;

        if (response && response.ok) {
          // --- AUTO SYNC TO ORDER TRACKING ---
          try {
            if (window.electron && response.name) {
                let targetHandover = null;
                if (payload.committed_lead_time) {
                    const match = payload.committed_lead_time.match(/(\d+)/);
                    if (match && match[1]) {
                        const weeks = parseInt(match[1]);
                        const orderDate = new Date(payload.order_date || Date.now());
                        orderDate.setDate(orderDate.getDate() + (weeks * 7));
                        targetHandover = orderDate.toISOString().split('T')[0];
                    }
                }
                
                // Only insert if not exists to avoid overwriting manual tracking updates
                let checkRes = await window.electron.invoke('supabase:query', {
                    table: 'omnis_tracking_orders', method: 'select', params: { filters: { linked_sale_name: response.name } }
                });
                
                let alreadyTracked = false;

                if (checkRes.ok && (!checkRes.data || checkRes.data.length === 0)) {
                    if (window._promotingTrackId) {
                        // Update existing tracking order instead of creating a duplicate
                        await window.electron.invoke('supabase:query', {
                            table: 'omnis_tracking_orders', method: 'update', params: {
                                data: { linked_sale_name: response.name, status: 'In Progress' },
                                filters: { id: window._promotingTrackId }
                            }
                        });
                        console.log("[Auto-Sync] Promoted tracking order:", window._promotingTrackId);
                        window._promotingTrackId = null;
                    } else {
                        await window.electron.invoke('supabase:query', {
                            table: 'omnis_tracking_orders', method: 'insert', params: { data: {
                                linked_sale_name: response.name,
                                customer: payload.customer || "Unknown",
                                brand: payload.oem || "",
                                model: payload.model || "",
                                machine: `${payload.oem || ''} ${payload.model || ''}`.trim() || "Unknown Machine",
                                qty: payload.qty || 1,
                                status: "In Progress",
                                order_date: payload.order_date,
                                target_handover: targetHandover,
                                committed_lead_time: payload.committed_lead_time || "",
                                company: payload.company || "Unassigned"
                            }}
                        });
                        console.log("[Auto-Sync] Group Sale automatically pushed to Order Tracking:", response.name);
                    }
                } else {
                    alreadyTracked = true;
                }

                if (window._forceTrackingPush) {
                    if (alreadyTracked) {
                        alert("This sale is already being tracked in the Order Tracking module.");
                    } else {
                        alert("Sale successfully pushed to Order Tracking!");
                    }
                    window._forceTrackingPush = false;
                }
            }
          } catch(syncErr) {
              console.error("[Auto-Sync Error]", syncErr);
              window._forceTrackingPush = false;
          }

          // --- NEW SALE EMAIL ALERT ---
          if (!window._editingGroupSaleName) {
            try { sendNewSaleAlert(payload, response.name); } catch(emailErr) { console.warn('[Sale Alert] Email failed:', emailErr); }
          }

          closeGroupSalesForm();
          loadGroupSalesList(true); // Refresh sales list
          // Re-enable with delay to ensure backend commit is ready
          setTimeout(() => {
            if (window.loadOrdersList) window.loadOrdersList(true); 
          }, 1000);
          omnisLog("Group Sale saved successfully: " + response.name);
        } else {
          throw new Error(response.error || "Save failed");
        }
      } catch (e) {
        console.error("Save Group Sale Error:", e);
        alert("Error saving record: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
        window._forceTrackingPush = false; // Ensure it's reset
      }
    }

    let spFormInited = false;
    window._editingStockId = null;
    window._spPotentialCustomers = [];
    window._stockRecordsMap = {}; // Global cache to prevent JSON string issues in onclick

    window.addSPPotentialCustomer = function(name, phone = "") {
      if (!name) return;
      console.log("Adding potential customer:", name, phone);
      
      if (!window._spPotentialCustomers) window._spPotentialCustomers = [];
      
      // Check for duplicates
      const exists = window._spPotentialCustomers.some(c => 
        (c.customer_name || "").toLowerCase() === name.toLowerCase()
      );
      
      if (!exists) {
        window._spPotentialCustomers.push({ customer_name: name, phone: phone });
        renderSPPotentialCustomers();
      }
      
      // ALWAYS clear input and focus back to allow rapid entry
      const input = document.getElementById('sp-customer-search');
      if (input) {
        input.value = '';
        input.focus();
      }
    };

    window.removeSPPotentialCustomer = function(index) {
      window._spPotentialCustomers.splice(index, 1);
      renderSPPotentialCustomers();
    };

    function renderSPPotentialCustomers() {
      const container = document.getElementById('sp-pot-cust-list');
      const warningContainer = document.getElementById('sp-earmark-warning');
      if (!container) return;
      
      const qty = parseInt(document.getElementById('sp-quantity').value || 0);
      const earmarkedCount = window._spPotentialCustomers.length;

      if (warningContainer) {
        if (earmarkedCount > qty && qty > 0) {
          warningContainer.innerHTML = `
            <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:10px 14px; margin-bottom:16px; display:flex; align-items:center; gap:10px; animation: fadeInUp 0.3s ease;">
              <i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i>
              <div style="font-size:12px; color:#9a3412; font-weight:600;">
                <span style="font-weight:800;">Over-Earmarked:</span> You have assigned ${earmarkedCount} customers to only ${qty} units.
              </div>
            </div>
          `;
          warningContainer.classList.remove('hidden');
        } else {
          warningContainer.classList.add('hidden');
        }
      }
      
      if (earmarkedCount === 0) {
        container.innerHTML = '<div style="color:#94a3b8; font-size:12px; padding:8px; border:1px dashed #e2e8f0; border-radius:8px; text-align:center;">No customers earmarked yet</div>';
        return;
      }

      container.innerHTML = window._spPotentialCustomers.map((c, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:4px; animation: slideInRight 0.2s ease;">
          <div style="flex:1;">
            <div style="font-weight:700; font-size:13px; color:#1e293b;">${c.customer_name}</div>
            <div style="font-size:10px; color:#64748b; display:flex; align-items:center; gap:6px;">
                ${c.phone ? `<span>${c.phone}</span>` : `
                    <input type="text" class="sp-phone-input" placeholder="Enter phone (e.g. +263...)" 
                           style="font-size:10px; padding:2px 6px; border:1px solid #cbd5e1; border-radius:4px; width:140px; background:white;"
                           onkeypress="if(event.key==='Enter') updateCustomerPhoneInSP(${idx}, this.value)">
                    <button onclick="updateCustomerPhoneInSP(${idx}, this.previousElementSibling.value)" 
                            style="font-size:9px; background:#f1f5f9; border:1px solid #e2e8f0; padding:2px 6px; border-radius:4px; cursor:pointer; font-weight:700;">Save</button>
                `}
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            ${c.phone ? `<button onclick="sendSPWhatsAppUpdate(${idx})" title="Send WhatsApp Update" style="background:none; border:none; color:#25d366; cursor:pointer; padding:4px; font-size:16px;"><i class="fab fa-whatsapp"></i></button>` : ''}
            <button onclick="removeSPPotentialCustomer(${idx})" title="Remove" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:4px;"><i class="fas fa-times-circle"></i></button>
          </div>
        </div>
      `).join('');
    }

    window.updateCustomerPhoneInSP = async function(idx, newPhone) {
        if (!newPhone || newPhone.trim() === "") {
            alert("Please enter a valid phone number");
            return;
        }

        const cust = window._spPotentialCustomers[idx];
        if (!cust) return;

        try {
            const res = await window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.update_customer_phone_omnis", {
                customer: cust.customer_name,
                phone: newPhone
            });

            if (res.ok) {
                // Update local state
                window._spPotentialCustomers[idx].phone = newPhone;
                renderSPPotentialCustomers();
                omnisLog("Updated phone for " + cust.customer_name);
            } else {
                alert("Failed to update phone: " + (res.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Phone Update Error:", err);
            alert("Error updating phone: " + err.message);
        }
    };

    window.sendSPWhatsAppUpdate = async function(idx) {
        const cust = window._spPotentialCustomers[idx];
        if (!cust || !cust.phone) return;

        const model = document.getElementById('sp-model-input').value;
        const qty = document.getElementById('sp-quantity').value;
        const etaHarare = document.getElementById('sp-eta-harare').value;

        let statusText = "In Stock";
        if (etaHarare) {
            statusText = "Expected Arrival in Harare: " + etaHarare;
        }

        const msg = `📦 *TRACKING UPDATE: STOCK INVENTORY*\n\n` +
                    `Machine: *${model}*\n` +
                    `Units Available: *${qty}*\n` +
                    `Current Status: *${statusText}*\n\n` +
                    `⚠️ _Subject to prior sales and payment required to secure the machine._\n\n` +
                    `Best regards,\n` +
                    `*The Machinery Exchange Team*`;

        if (!confirm("Send WhatsApp update to " + cust.customer_name + "?\n\n" + msg)) return;

        try {
            const res = await window.electron.invoke('whatsapp:send-msg', { to: cust.phone, body: msg });
            if (res.ok) {
                alert("WhatsApp update sent successfully to " + cust.customer_name);
            } else {
                alert("Failed to send WhatsApp update: " + (res.error || "Unknown error"));
            }
        } catch (err) {
            alert("Error sending WhatsApp: " + err.message);
        }
    };

    window.showStockPipelineForm = function (inputData = null) {
      try {
      try {
      const overlay = document.getElementById('sp-form-overlay');
      const titleEl = overlay ? overlay.querySelector('h2') : null;

      if (overlay) {
        let data = inputData;
        
        // Support ID-based lookup from global cache
        if (typeof data === 'string' && window._stockRecordsMap[data]) {
          data = window._stockRecordsMap[data];
        } else if (typeof data === 'string' && data.trim().startsWith('{')) {
          try { data = JSON.parse(data); } catch (e) { console.error("Parse error", e); }
        }

        const id = data ? (data.name || data.report_id || null) : null;
        window._editingStockId = id;

        if (titleEl) {
          titleEl.innerText = id ? `Edit Stock Pipeline Entry (${id})` : "New Stock Pipeline Entry";
        }

        const deleteBtn = overlay.querySelector('.gs-btn-delete');
        if (deleteBtn) {
          deleteBtn.style.display = id ? "inline-block" : "none";
          deleteBtn.onclick = () => window.deleteStockPipelineRecord(id);
        }

        // Fill fields
        document.getElementById('sp-oem').value = data ? (data.oem || "") : "";
        document.getElementById('sp-model-input').value = data ? (data.model || "") : "";
        document.getElementById('sp-contract').value = data ? (data.contract || data.contract_number || "") : "";
        document.getElementById('sp-proposed-order').value = data ? (data.proposed_order || "0") : "0";
        document.getElementById('sp-quantity').value = data ? (data.quantity || "0") : "0";
        document.getElementById('sp-prod-compl').value = data ? (data.production_completion || "") : "";
        document.getElementById('sp-shipping').value = data ? (data.shipping_date || "") : "";
        document.getElementById('sp-eta-durban').value = data ? (data.eta_durban || "") : "";
        document.getElementById('sp-ted').value = data ? (data.ted || "") : "";
        document.getElementById('sp-eta-harare').value = data ? (data.eta_harare || "") : "";

        // Potential Customers (Robust Parsing)
        let pcs = [];
        if (data && data.potential_customers) {
           console.log("[Stock] Loading Potential Customers for " + id, data.potential_customers);
           try {
             pcs = typeof data.potential_customers === 'string' ? JSON.parse(data.potential_customers) : data.potential_customers;
             if (!Array.isArray(pcs)) pcs = [];
           } catch(e) { console.error("PC Parse Error", e); pcs = []; }
        } else {
           console.log("[Stock] No potential customers found in data for " + id);
        }
        window._spPotentialCustomers = [...pcs];
        console.log("[Stock] Form initialized with " + window._spPotentialCustomers.length + " earmarks");
        renderSPPotentialCustomers();
        const searchInput = document.getElementById('sp-customer-search');
        if (searchInput) searchInput.value = '';

        if (!spFormInited) {
          setupSupabaseSuggestions(document.getElementById('sp-oem'), document.getElementById('sp-oem-suggest'), "brands", "name");
          setupSupabaseSuggestions(document.getElementById('sp-model-input'), document.getElementById('sp-model-suggest'), "products", "item_name,item_code", (selected) => {
            const oemInput = document.getElementById('sp-oem');
            if (selected.brand && oemInput) {
              oemInput.value = selected.brand;
              // Visual feedback
              oemInput.classList.add('flash-attention');
              setTimeout(() => oemInput.classList.remove('flash-attention'), 2000);
            }
          });

          // Customer search for earmarks
          setupSuggestions(document.getElementById('sp-customer-search'), document.getElementById('sp-cust-suggest'), "search_customer_for_omnis", (selected) => {
            window.addSPPotentialCustomer(selected.description || selected.value, selected.phone || "");
          });

          spFormInited = true;
        }
        overlay.style.display = "flex";
      }
      } catch(err) { alert("Error in form: " + err.message + "\n" + err.stack); }
    };

    window.closeStockPipelineForm = function () {
      const overlay = document.getElementById('sp-form-overlay');
      if (overlay) overlay.style.display = "none";
    };

    async function saveStockPipelineRecord() {
      const btn = document.getElementById('btn-save-stock-pipeline');
      const originalText = btn.textContent;

      const payload = {
        name: window._editingStockId || "",
        report_id: window._editingStockId || "", // Redundant for extract_params robustness
        oem: document.getElementById('sp-oem').value,
        model: document.getElementById('sp-model-input').value,
        contract_name: document.getElementById('sp-contract').value,
        proposed_order: document.getElementById('sp-proposed-order').value,
        quantity: document.getElementById('sp-quantity').value,
        production_completion: document.getElementById('sp-prod-compl').value,
        shipping_date: document.getElementById('sp-shipping').value,
        eta_durban: document.getElementById('sp-eta-durban').value,
        ted: document.getElementById('sp-ted').value,
        eta_harare: document.getElementById('sp-eta-harare').value,
        potential_customers: JSON.stringify(window._spPotentialCustomers)
      };

      if (!payload.oem || !payload.model) {
        alert("OEM and Model are required");
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = "Saving...";

        if (!CURRENT_SYSTEM) throw new Error("System not connected.");
        const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");

        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.save_stock_pipeline", payload);
        const response = res.message || res;

        if (response && response.ok) {
          closeStockPipelineForm();
          
          // --- Supabase Real-time Sync ---
          try {
             if (window.salestrack && window.salestrack.supabase) {
                const stockId = response.name;
                const sp = window.salestrack.supabase;
                
                // Intelligent Company Mapping
                // Stock doesn't have an owner field in the payload, but we can check CURRENT_SYSTEM or brand
                let companyTag = "Sinopower"; // Default
                const oem = (payload.oem || "").toLowerCase();
                if (oem.includes("machinery") || oem.includes("bobcat") || oem.includes("hitachi") || oem.includes("shantui")) {
                    // These brands are usually Machinery Exchange
                    companyTag = "Machinery Exchange";
                }

                const { data: sData, error: sErr } = await sp.from('stock_inventory').upsert({
                    frappe_id: stockId,
                    company: companyTag,
                    brand: payload.oem,
                    model: payload.model,
                    contract_name: payload.contract_name || null,
                    proposed_qty: parseInt(payload.proposed_order) || 0,
                    actual_qty: parseInt(payload.quantity) || 0,
                    prod_date: payload.production_completion || null,
                    ship_date: payload.shipping_date || null,
                    eta_durban: payload.eta_durban || null,
                    eta_beira: payload.ted || payload.eta_beira || null,
                    eta_harare: payload.eta_harare || null
                }, { onConflict: 'frappe_id' }).select();

                if (!sErr && sData && sData.length > 0) {
                    const stockUuid = sData[0].id;
                    // Sync Potential Customers
                    let pcs = [];
                    try { pcs = JSON.parse(payload.potential_customers); } catch(e) {}
                    
                    if (Array.isArray(pcs)) {
                        await sp.from('stock_potential_customers').delete().eq('stock_id', stockUuid);
                        if (pcs.length > 0) {
                            const custPayloads = pcs.map(p => ({
                                stock_id: stockUuid,
                                customer_name: p.customer_name || p.customer || p.name || ""
                            })).filter(p => p.customer_name);
                            if (custPayloads.length > 0) {
                                await sp.from('stock_potential_customers').insert(custPayloads);
                            }
                        }
                    }
                    console.log("[Supabase] Stock Sync Successful:", stockId);
                } else if (sErr) {
                    console.error("[Supabase] Stock Sync Error:", sErr);
                }
             }
          } catch(syncErr) {
             console.error("[Supabase] Sync Logic Error:", syncErr);
          }

          // Bust the local cache so the next render fetches fresh data
          if (CURRENT_SYSTEM) {
            localStorage.removeItem("mxg_stock_data_" + CURRENT_SYSTEM.id);
          }
          if (window._stockViewMode === 'calendar') {
            window.renderArrivalCalendar();
          } else {
            window.renderStockTab();
          }
          omnisLog("Stock record " + (window._editingStockId ? "updated" : "saved") + " successfully: " + response.name);
          window._editingStockId = null;
        } else {
          throw new Error(response.error || "Save failed");
        }
      } catch (e) {
        console.error("Save Stock Error:", e);
        alert("Error saving record: " + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }

    // Save button uses direct onclick="saveStockPipelineRecord()" in HTML
    // (document delegation blocked by event.stopPropagation() on modal inner div)
    window.saveStockPipelineRecord = saveStockPipelineRecord;

    // --- PREMIUM UNIFIED CONFIRMATION DIALOG ---
    window.showOmnisConfirm = function (opts = {}) {
      return new Promise((resolve) => {
        const overlay = document.getElementById('omnis-confirm-overlay');
        const titleEl = document.getElementById('omnis-confirm-title');
        const msgEl = document.getElementById('omnis-confirm-msg');
        const primaryBtn = document.getElementById('omnis-confirm-primary-btn');
        const headerEl = document.getElementById('omnis-confirm-card-header');
        const iconEl = document.getElementById('omnis-confirm-icon-el');

        if (!overlay || !titleEl || !msgEl || !primaryBtn || !headerEl) {
          resolve(confirm(opts.message || "Are you sure?"));
          return;
        }

        titleEl.innerText = opts.title || "Confirm Action";
        msgEl.innerText = opts.message || "Are you sure you want to proceed?";
        primaryBtn.innerText = opts.confirmText || "Confirm";

        // Apply danger styling
        if (opts.danger) {
          headerEl.classList.add('danger');
          primaryBtn.classList.add('danger');
          if (iconEl) iconEl.className = 'fas fa-trash-alt';
        } else {
          headerEl.classList.remove('danger');
          primaryBtn.classList.remove('danger');
          if (iconEl) iconEl.className = 'fas fa-exclamation-triangle';
        }

        // Guarantee it is a direct child of body so it cannot be hidden by a parent
        if (overlay.parentNode !== document.body) {
          document.body.appendChild(overlay);
        }

        // Setup resolution
        window._omnisConfirmResolve = (val) => {
          overlay.classList.remove('active');
          delete window._omnisConfirmResolve;
          resolve(val);
        };

        primaryBtn.onclick = () => window._omnisConfirmResolve(true);
        // Force the highest possible z-index dynamically just in case
        overlay.style.setProperty('z-index', '2147483647', 'important');
        overlay.classList.add('active');

        // Escape key to cancel
        const keyHandler = (e) => {
          if (e.key === 'Escape' && window._omnisConfirmResolve) {
            window._omnisConfirmResolve(false);
            document.removeEventListener('keydown', keyHandler);
          }
        };
        document.addEventListener('keydown', keyHandler);
        setTimeout(() => primaryBtn.focus(), 50);
      });
    };

    window.deleteStockPipelineRecord = async function (id) {
      if (!id) return;

      const confirmed = await window.showOmnisConfirm({
        title: "Delete Pipeline Entry",
        message: `Are you sure you want to permanently delete record ${id}? This action cannot be undone.`,
        confirmText: "Delete Record"
      });
      if (!confirmed) return;

      try {
        if (!CURRENT_SYSTEM) throw new Error("System not connected.");
        const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");

        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.delete_stock_pipeline", { name: id });
        const response = res.message || res; // Fix: Robust response parsing

        if (response && response.ok) {
          // --- Supabase Delete Sync ---
          try {
             if (window.salestrack && window.salestrack.supabase) {
                await window.salestrack.supabase.from('stock_inventory').delete().eq('frappe_id', id);
                console.log("[Supabase] Stock Delete Successful:", id);
             }
          } catch(e) { console.error("[Supabase] Delete Sync Error:", e); }

          window.showToast?.('Record Deleted Successfully', 'success');
          window.closeStockPipelineForm();
          // Bust the local cache so the next render fetches fresh data
          if (CURRENT_SYSTEM) {
            localStorage.removeItem("mxg_stock_data_" + CURRENT_SYSTEM.id);
          }
          // Refresh current view
          if (window._stockViewMode === 'calendar') {
            window.renderArrivalCalendar();
          } else {
            window.renderStockTab();
          }
        } else {
          window.showToast?.('Delete Error: ' + (response.error || 'Unknown'), 'error');
        }
      } catch (err) {
        console.error("Delete Stock Pipeline Error:", err);
        alert("Error deleting record: " + err.message);
      }
    };

    function showConstruction(featureName) {
      const m = document.getElementById('construction-modal');
      const t = document.getElementById('construction-title');
      const msg = document.getElementById('construction-msg');
      if (m && t && msg) {
        t.innerText = `Create ${featureName} `;
        msg.innerHTML = `The < b > Create ${featureName}</b > form is coming soon.< br > Please use the ERPNext backend for now.`;
        m.classList.remove('hidden');
      }
    }