
    /**
     * GSM Weekly Report Logic (MXG Style)
     */
    (function () {
      // Global helpers for early access
      window.setText = function (id, txt) {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      };

      const S = {
        page: 1,
        data: null,
        loading: false,
        ordersData: [],
        ordersFilter: {},
        ordersSort: { key: 'days_left', dir: 1 },
        viewMode: 'table'
      };

      const E = {}; // Elements cache

      window._stockViewMode = 'table';
      window._activeStockOem = 'All';
      window._syncingStock = false;

      // ─────────────────────────────────────────────────────────────────
      // STOCK PIPELINE LOGIC
      // ─────────────────────────────────────────────────────────────────

      function getOEMLogo(brand) {
        const b = (brand || '').toLowerCase();
        
        if (window._stockCompanyMappings) {
           const mapped = window._stockCompanyMappings.find(m => m.brand && m.brand.toLowerCase() === b);
           if (mapped && typeof mapped.logo_url !== 'undefined' && mapped.logo_url !== null) {
               // If it's explicitly mapped (even to an empty string), use it.
               // If empty string, return null so the text fallback is used.
               return mapped.logo_url === '' ? null : mapped.logo_url;
           }
        }

        if (b.includes('shantui')) return 'assets/images/Shantui_logo.png';
        if (b.includes('hitachi')) return 'assets/images/Hitachi_logo.png';
        if (b.includes('bobcat')) return 'assets/images/Bobcat_Black.png';
        if (b.includes('sinopower')) return 'assets/images/omnis-logo.png';
        if (b.includes('machinery') || b.includes('mxg')) return 'assets/images/omnis-logo.png'; // Generic fallback
        return null;
      }


      window.renderStockTab = async function () {
        console.log("[Stock] renderStockTab triggered");
        
        // Always re-fetch mappings so Settings changes are immediately reflected
        if (window.omnisFetchStockCompanyMappings) {
            await window.omnisFetchStockCompanyMappings();
        }
        
        // DIAGNOSTIC: Check schema on the fly
        try {
           const dbgBase = (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.baseUrl) || "https://salestrack.powerstar.co.zw";
           window.callFrappeSequenced(dbgBase, "powerstar_salestrack.omnis_dashboard.debug_stock_pipeline_schema", {}).then(r => {
             console.log("[Stock] Schema Diagnostic Result:", r);
           });
        } catch(e){}

        window._stockViewMode = window._stockViewMode || 'table';
        const container = document.getElementById('stock-tab-content');
        if (!container) return;

        const cacheKey = 'mxg_stock_pipeline_cache';

        const renderLoading = () => {
          let skeletons = "";
          for(let i=0; i<3; i++) {
            skeletons += `
              <div class="ai-order-row ai-stock-grid skeleton-pulse" style="margin-bottom:8px; opacity:0.6;">
                <div style="height:20px; background:#f1f5f9; border-radius:4px; width:60%;"></div>
                <div style="height:20px; background:#f1f5f9; border-radius:4px; width:70%;"></div>
                <div style="height:20px; background:#f1f5f9; border-radius:4px; width:70%;"></div>
                <div style="height:30px; background:#f1f5f9; border-radius:4px; width:40%; margin:0 auto;"></div>
                <div style="height:24px; background:#f1f5f9; border-radius:4px; width:40%; margin:0 auto;"></div>
                <div style="height:18px; background:#f1f5f9; border-radius:4px; width:70%; margin:0 auto;"></div>
                <div style="height:18px; background:#f1f5f9; border-radius:4px; width:70%; margin:0 auto;"></div>
                <div style="height:18px; background:#f1f5f9; border-radius:4px; width:80%; margin:0 auto;"></div>
                <div style="height:18px; background:#f1f5f9; border-radius:4px; width:80%; margin:0 auto;"></div>
                <div style="height:18px; background:#f1f5f9; border-radius:4px; width:90%; margin:0 auto;"></div>
                <div style="height:28px; background:#f1f5f9; border-radius:4px; width:60px; margin-left:auto;"></div>
              </div>
            `;
          }
          container.innerHTML = `
            <div style="padding:0 8px;">
              <div style="height:30px; background:#f1f5f9; border-radius:6px; width:200px; margin-bottom:12px;" class="skeleton-pulse"></div>
              <div class="ai-order-header ai-stock-grid" style="border-radius:12px 12px 0 0; margin-bottom:8px; opacity:0.3;">
                <div>...</div><div>...</div><div>...</div><div>...</div><div>...</div><div>...</div><div>...</div><div>...</div><div>...</div><div>...</div><div>...</div>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${skeletons}
              </div>
              <div style="text-align:center; padding:30px; color:#94a3b8; font-size:12px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase;">
                Syncing Global Inventory...
              </div>
            </div>
          `;
        };

        const performRender = (data_records) => {
          if (window._stockViewMode === 'calendar') {
            window.renderArrivalCalendar();
            return;
          }

          const groups = {};
          const oemList = new Set();
          window._stockRecordsMap = {}; // Reset cache

          data_records.forEach(r => {
            let brand = r.oem || "Other";
            
            // Reassign "Special Build" items if their name contains the actual brand
            const checkBrand = brand.toLowerCase().trim();
            if (checkBrand === "special build" || checkBrand === "special builds" || checkBrand.includes("special")) {
                const searchString = `${r.item_name || ''} ${r.model || ''} ${r.description || ''} ${r.name || ''}`.toLowerCase();
                if (searchString.includes('foton')) {
                    brand = "Foton";
                } else if (searchString.includes('powerstar')) {
                    brand = "Powerstar";
                } else if (searchString.includes('sino')) {
                    brand = "Sino";
                }
            }

            if (!groups[brand]) groups[brand] = [];
            groups[brand].push(r);
            oemList.add(brand);
            
            // Populate cache
            if (r.name) window._stockRecordsMap[r.name] = r;
          });

          // 1. DYNAMICALLY BUILD NAV BUTTONS
          const navContainer = document.getElementById('stock-subnav');
          if (navContainer) {
            const sortedOems = Array.from(oemList).sort();
            const activeOem = window._activeStockOem || 'All';
            const activeStatus = window._activeStockStatus || 'All';
            
            let navHtml = `
              <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                 <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <span style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; width: 60px;">Brand:</span>
                    <button class="btn-stock-filter ${activeOem === 'All' ? 'active' : ''}" onclick="filterStock('All', window._activeStockStatus, this, window._activeStockCompany, window._activeStockContract)">All Stock</button>
            `;
            
            sortedOems.forEach(oem => {
                navHtml += `<button class="btn-stock-filter ${activeOem === oem ? 'active' : ''}" onclick="filterStock('${oem}', window._activeStockStatus, this, window._activeStockCompany, window._activeStockContract)">${oem}</button>`;
            });

            navHtml += `
                    <button class="btn-stock-filter" onclick="renderArrivalCalendar(); updateStockBtn(this)">📅 Monthly Arrivals</button>
                    <button class="btn-stock-filter" onclick="showStockPipelineForm()"
                        style="margin-left:auto; background:#800000; color:white; border-color:#800000;">+ Add New Record</button>
                 </div>
              </div>
            `;
            navContainer.innerHTML = navHtml;
          }

          let html = '';
          if (Object.keys(groups).length === 0) {
            html = `<div style="text-align:center; padding:80px; color:#64748b;">No Pipeline Records Found</div>`;
          }

          Object.keys(groups).sort().forEach(brand => {
            const secRecords = groups[brand];
            const phaseGroups = {};
            secRecords.forEach(r => {
              const safeData = JSON.stringify(r).replace(/'/g, "&#39;").replace(/`/g, "\\`").replace(/"/g, "&quot;");
              const safeName = (r.name || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, "\\n").replace(/\r/g, "");
              
              const earmarkedCount = (r.potential_customers || []).length;
              const hasEarmark = earmarkedCount > 0;
              const isOverEarmarked = earmarkedCount > (r.quantity || 0);
              
              // Pipeline Status Logic
              let statusText = "OTHER";
              let statusColor = "#64748b";
              let statusIcon = "fa-circle-info";
              
              try {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  
                  const parseDate = (dStr) => {
                      if (!dStr || dStr === '-' || dStr === '0000-00-00') return null;
                      const d = new Date(dStr);
                      return isNaN(d.getTime()) ? null : d;
                  };

                  const dProd = parseDate(r.production_completion);
                  const dShip = parseDate(r.shipping_date);
                  const dDurban = parseDate(r.eta_durban);
                  const dBeira = parseDate(r.eta_beira || r.ted);
                  const dHarare = parseDate(r.eta_harare);

                  if (dHarare && dHarare <= today) {
                      statusText = "STOCK ON HAND";
                      statusColor = "#f59e0b"; // Keeping the original orange for this
                      statusIcon = "fa-clock";
                  } else if (dBeira && dBeira <= today && (!dHarare || dHarare > today)) {
                      statusText = "EN ROUTE FROM BEIRA";
                      statusColor = "#0284c7"; // Light Blue
                      statusIcon = "fa-truck-moving";
                  } else if (dDurban && dDurban <= today && (!dBeira || dBeira > today)) {
                      statusText = "EN ROUTE FROM DURBAN";
                      statusColor = "#0284c7"; // Light Blue
                      statusIcon = "fa-ship";
                  } else if (dShip && dShip <= today && ((dBeira && dBeira > today) || (dDurban && dDurban > today))) {
                      statusText = "IN TRANSIT (SHIPPED)";
                      statusColor = "#2563eb"; // Blue
                      statusIcon = "fa-water";
                  } else if (dShip && dShip > today) {
                      statusText = "ARRANGING SHIPPING";
                      statusColor = "#8b5cf6"; // Purple
                      statusIcon = "fa-boxes";
                  } else if (dProd && dProd > today) {
                      statusText = "IN PRODUCTION";
                      statusColor = "#ea580c"; // Orange
                      statusIcon = "fa-hammer";
                  }
              } catch(e) {}
              
              if (!phaseGroups[statusText]) phaseGroups[statusText] = [];
              phaseGroups[statusText].push({ r, safeName, hasEarmark, isOverEarmarked, earmarkedCount, statusText, statusColor, statusIcon });
            });

            let brandBodyHtml = "";
            const phaseOrder = [
                "STOCK ON HAND",
                "EN ROUTE FROM BEIRA",
                "EN ROUTE FROM DURBAN",
                "IN TRANSIT (SHIPPED)",
                "ARRANGING SHIPPING",
                "IN PRODUCTION",
                "OTHER"
            ];
            
            const sortedPhases = Object.keys(phaseGroups).sort((a, b) => {
                const idxA = phaseOrder.indexOf(a);
                const idxB = phaseOrder.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
            });

            sortedPhases.forEach(phase => {
                const phaseItems = phaseGroups[phase];
                
                let rowsHtml = "";
                phaseItems.forEach(item => {
                    const { r, safeName, hasEarmark, isOverEarmarked, earmarkedCount, statusText, statusColor, statusIcon } = item;
                    
                    let rowStyle = "";
                    let earmarkBadge = "";
                    let customerNamesHtml = "";
                    
                    if (isOverEarmarked) {
                      rowStyle = 'border-left: 4px solid #f59e0b; background: #fffbeb; animation: risk-pulse 2s infinite;';
                      earmarkBadge = `<div style="margin-top:4px; display:inline-flex; align-items:center; gap:4px; background:#f59e0b; color:white; padding:2px 8px; border-radius:4px; font-size:9px; font-weight:800; text-transform:uppercase;">CONFLICT: ${earmarkedCount} CUST</div>`;
                    } else if (hasEarmark) {
                      earmarkBadge = `<div style="margin-top:4px; display:inline-flex; align-items:center; gap:4px; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px; font-size:9px; font-weight:800; text-transform:uppercase;">EARMARKED: ${earmarkedCount}</div>`;
                    }

                    if (hasEarmark) {
                       const names = (r.potential_customers || []).map(c => typeof c === 'string' ? c : (c.customer_name || c.customer || c.name || '')).filter(Boolean).join(', ');
                       if (names) {
                          customerNamesHtml = `<div style="margin-top:4px; font-size:9.5px; color:#475569; font-weight:600; white-space: normal; line-height: 1.2;"><i class="fas fa-users" style="margin-right:4px; color:#94a3b8;"></i>${names}</div>`;
                       }
                    }

                    let handBadge = "";
                    if (statusText) {
                       handBadge = `
                        <div style="display:flex; align-items:center; gap:6px; font-size:9.5px; font-weight:800; color:${statusColor}; margin-top:4px; letter-spacing:0.3px;">
                          <i class="fas ${statusIcon}"></i> ${statusText}
                        </div>`;
                    }

                    rowsHtml += `
                      <div class="ai-order-row ai-stock-grid stock-row-item" data-status="${statusText || ''}" style="${rowStyle}">
                        <div class="ai-order-cell">
                          <span class="cell-label">Model</span>
                          <div style="font-weight:700; font-size:12px; color:#1e293b;">${r.model || '-'}</div>
                          ${earmarkBadge}
                          ${handBadge}
                        </div>
                        <div class="ai-order-cell">
                          <span class="cell-label">Contract</span>
                          <div style="font-weight:600; font-size:11.5px; color:#475569;" class="stock-row-contract-val">${r.contract || r.contract_number || '-'}</div>
                        </div>
                        <div class="ai-order-cell">
                          <span class="cell-label">Potential Customers</span>
                          ${customerNamesHtml}
                        </div>
                        <div class="ai-order-cell" style="text-align:center;">
                          <span class="cell-label">Qty</span>
                          <div style="font-weight:900; font-size:13px; color:#1e293b;">${r.quantity || 0}</div>
                        </div>
                        <div class="ai-order-cell" style="text-align:center;">
                          <span class="cell-label">Proposed</span>
                          <div style="font-weight:600; font-size:11.5px; color:#64748b;">${r.proposed_order || r.proposed_order_quantity || 0}</div>
                        </div>
                        <div class="ai-order-cell" style="text-align:center;">
                          <span class="cell-label">Prod</span>
                          <div style="font-size:11px; color:#64748b;">${r.production_completion || '-'}</div>
                        </div>
                        <div class="ai-order-cell" style="text-align:center;">
                          <span class="cell-label">Ship</span>
                          <div style="font-size:11px; color:#64748b;">${r.shipping_date || '-'}</div>
                        </div>
                        <div class="ai-order-cell" style="text-align:center;">
                          <span class="cell-label">Durban</span>
                          <div style="font-size:11px; font-weight:700; color:#0369a1;">${r.eta_durban || '-'}</div>
                        </div>
                        <div class="ai-order-cell" style="text-align:center;">
                          <span class="cell-label">Beira</span>
                          <div style="font-size:11px; font-weight:700; color:#0369a1;">${r.ted || r.eta_beira || '-'}</div>
                        </div>
                        <div class="ai-order-cell" style="text-align:center;">
                          <span class="cell-label">Harare</span>
                          <div style="font-size:11px; font-weight:800; color:#15803d;">${r.eta_harare || '-'}</div>
                        </div>
                        <div class="ai-order-row-actions" style="text-align:right; display:flex; gap:8px; justify-content:flex-end;">
                          <button class="btn-text-action" onclick="showStockPipelineForm('${safeName}')" style="color:#3b82f6;"><i class="fas fa-pencil-alt"></i></button>
                          <button class="btn-text-action" onclick="deleteStockPipelineRecord('${safeName}')" style="color:#ef4444;"><i class="fas fa-trash-alt"></i></button>
                        </div>
                      </div>`;
                });
                
                const phaseId = `phase_${brand.replace(/[^a-zA-Z0-9]/g, '')}_${phase.replace(/[^a-zA-Z0-9]/g, '')}`;
                brandBodyHtml += `
                  <!-- Phase Group Header -->
                  <div onclick="const e = document.getElementById('${phaseId}'); const i = this.querySelector('.fa-chevron-down, .fa-chevron-right'); if(e.style.display==='none'){e.style.display='block'; i.classList.replace('fa-chevron-right','fa-chevron-down');}else{e.style.display='none'; i.classList.replace('fa-chevron-down','fa-chevron-right');}" style="cursor: pointer; padding: 10px 14px; margin-top: 16px; margin-bottom: 8px; background: rgba(0,0,0,0.03); border-left: 4px solid ${phaseItems[0].statusColor}; border-radius: 0 4px 4px 0; font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.06)'" onmouseout="this.style.background='rgba(0,0,0,0.03)'">
                      <div style="display:flex; align-items:center; gap:8px;">
                          <i class="fas fa-chevron-right" style="color:#94a3b8; font-size:11px; width:12px; text-align:center;"></i>
                          <span><i class="fas ${phaseItems[0].statusIcon}" style="margin-right: 6px; color: ${phaseItems[0].statusColor};"></i> ${phase}</span>
                      </div>
                      <span style="font-size: 11px; font-weight: 700; color: #64748b; background: #fff; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">${phaseItems.length} UNIT(S)</span>
                  </div>
                  <div id="${phaseId}" style="display: none;">
                      ${rowsHtml}
                  </div>
                `;
            });

            html += `
              <div class="mxg-table-container" style="background:transparent; box-shadow:none; border:none; padding:0; margin-bottom:40px;" id="stock-section-${brand}" data-oem="${brand}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:0 8px;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    ${getOEMLogo(brand) ? `<img src="${getOEMLogo(brand)}" style="height:42px; object-fit:contain; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.15));">` : `<div style="font-weight:900; font-size:20px; color:#0f172a;">${brand.toUpperCase()}</div>`}
                  </div>
                  <div style="font-size:11px; font-weight:700; color:#64748b; background:#f1f5f9; padding:4px 10px; border-radius:6px; letter-spacing:0.02em;">ENTRIES: ${secRecords.length}</div>
                </div>

                <!-- Stock Grid Header -->
                <div class="ai-order-header ai-stock-grid" style="border-radius:12px 12px 0 0; margin-bottom:8px;">
                  <div>Model</div>
                  <div>Contract</div>
                  <div>Potential Customers</div>
                  <div style="text-align:center;">Qty</div>
                  <div style="text-align:center;">Proposed</div>
                  <div style="text-align:center;">Prod</div>
                  <div style="text-align:center;">Ship</div>
                  <div style="text-align:center;">Durban</div>
                  <div style="text-align:center;">Beira</div>
                  <div style="text-align:center;">Harare</div>
                  <div style="text-align:right;">Actions</div>
                </div>

                <!-- Stock Grid Body -->
                <div class="ai-order-body" style="display:flex; flex-direction:column; gap:4px;">
                  ${brandBodyHtml}
                </div>
              </div>`;
          });
          // 1.5 Populate Contract Dropdown options based on available data
          const contractDropdown = document.getElementById('stock-contract-dropdown');
          if (contractDropdown) {
              const contractList = new Set();
              data_records.forEach(r => {
                  const c = (r.contract || r.contract_number || '').trim();
                  if (c && c !== '-') contractList.add(c);
              });
              
              let currentVal = contractDropdown.value;
              let optsHtml = '<option value="All">ALL CONTRACTS</option>';
              Array.from(contractList).sort().forEach(c => {
                  optsHtml += `<option value="${c}">${c}</option>`;
              });
              contractDropdown.innerHTML = optsHtml;
              
              // Restore value if it still exists
              if (contractList.has(currentVal) || currentVal === 'All') {
                  contractDropdown.value = currentVal;
              } else {
                  contractDropdown.value = 'All';
              }
          }

          container.innerHTML = html;
          window.filterStock(window._activeStockOem || 'All', window._activeStockStatus || 'All', null, window._activeStockCompany || 'All', window._activeStockContract || 'All');
        };

        // Initialize UI instantly with skeletons if no data
        const cached = localStorage.getItem(cacheKey);
        let records = [];
        if (cached) {
          try {
            const entry = JSON.parse(cached);
            records = entry.data;
          } catch (e) { }
        }

        if (records.length === 0) {
          renderLoading();
        } else {
          performRender(records);
        }

        // Background Sync (Supabase Only)
        if (window._syncingStock) return;
        try {
          window._syncingStock = true;
          let sData = null;
          let sErr = null;
          if (window.electron) {
             const res = await window.electron.invoke('supabase:query', {
                 table: 'stock_inventory',
                 method: 'select',
                 params: { columns: '*, stock_potential_customers(customer_name)' }
             });
             if (res.ok) { sData = res.data; } else { sErr = res.error; }
          } else if (window.salestrack && window.salestrack.supabase) {
             const sp = window.salestrack.supabase;
             const res = await sp.from('stock_inventory').select('*, stock_potential_customers(customer_name)');
             sData = res.data; sErr = res.error;
          }
          if (!sErr && sData) {
             records = sData.map(r => ({
                 name: r.frappe_id || r.id, // Primary key reference for editing
                 id: r.id,
                 oem: r.brand,
                 model: r.model,
                 proposed_order: r.proposed_qty,
                 quantity: r.actual_qty,
                 production_completion: r.prod_date,
                 shipping_date: r.ship_date,
                 eta_durban: r.eta_durban,
                 eta_beira: r.eta_beira,
                 ted: r.eta_beira,
                 eta_harare: r.eta_harare,
                 contract: r.contract_name,
                 potential_customers: r.stock_potential_customers || []
             }));
             localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: records }));
          }
        } catch (err) { console.error("Stock sync failed", err); }
        finally { window._syncingStock = false; performRender(records); }
      };

      window.filterStock = function (oem, status, btn, company, contract) {
        window._activeStockOem = oem || window._activeStockOem || 'All';
        window._activeStockStatus = status || window._activeStockStatus || 'All';
        window._activeStockCompany = company || window._activeStockCompany || 'All';
        window._activeStockContract = contract || window._activeStockContract || 'All';
        
        if (btn) {
            window.updateStockBtn(btn);
        } else {
            // Re-sync buttons if called programmatically
            document.querySelectorAll('.btn-stock-filter').forEach(b => {
                b.classList.toggle('active', b.innerText.trim().toLowerCase() === window._activeStockOem.toLowerCase() || (window._activeStockOem === 'All' && b.innerText.includes('All Stock')));
            });
            const statusDropdown = document.getElementById('stock-status-dropdown');
            if (statusDropdown) statusDropdown.value = window._activeStockStatus;
            const companyDropdown = document.getElementById('stock-company-dropdown');
            if (companyDropdown) companyDropdown.value = window._activeStockCompany;
            const contractDropdown = document.getElementById('stock-contract-dropdown');
            if (contractDropdown) contractDropdown.value = window._activeStockContract;
        }

        // CRITICAL: If we are in calendar mode, we need to switch back to table mode and re-render
        if (window._stockViewMode === 'calendar') {
          window._stockViewMode = 'table';
          window.renderStockTab();
          return;
        }

        const sections = document.querySelectorAll('.mxg-table-container');
        if (sections.length === 0) return;

        const targetOem = window._activeStockOem.toLowerCase();
        const targetStatus = window._activeStockStatus;
        const targetCompany = window._activeStockCompany;
        const targetContract = window._activeStockContract;
        const mappings = window._stockCompanyMappings || [];

        // NEW LOGIC: Filter brand pills based on company
        const subnavContainer = document.getElementById('stock-subnav');
        if (subnavContainer) {
            subnavContainer.querySelectorAll('.btn-stock-filter').forEach(btn => {
                const btnText = btn.innerText.trim();
                // Skip non-brand buttons
                if (btnText === 'All Stock' || btnText.includes('Monthly') || btnText.includes('Add New')) {
                    btn.style.display = ''; 
                    return;
                }
                
                let pillCompanyMatch = true;
                if (targetCompany !== 'All') {
                    const mappedCompanyObj = mappings.find(m => m.brand && m.brand.toLowerCase() === btnText.toLowerCase());
                    const mappedCompany = mappedCompanyObj ? mappedCompanyObj.company : null;
                    if (mappedCompany !== targetCompany) {
                        pillCompanyMatch = false;
                    }
                }
                btn.style.display = pillCompanyMatch ? '' : 'none';
            });
        }

        sections.forEach(sec => {
          const secOem = (sec.dataset.oem || '').toLowerCase();
          
          // Determine company match
          let companyMatch = true;
          if (targetCompany !== 'All') {
              const mappedCompanyObj = mappings.find(m => m.brand && m.brand.toLowerCase() === secOem);
              const mappedCompany = mappedCompanyObj ? mappedCompanyObj.company : null;
              if (mappedCompany !== targetCompany) {
                  companyMatch = false;
              }
          }
          
          let sectionHasVisibleRows = false;
          
              // Process each phase group to hide/show its header based on row visibility
              const phaseGroups = sec.querySelectorAll('div[id^="phase_"]');
              phaseGroups.forEach(group => {
                  let groupHasVisibleRows = false;
                  const rows = group.querySelectorAll('.stock-row-item');
                  rows.forEach(row => {
                    const rowStatus = row.getAttribute('data-status') || '';
                    const contractVal = (row.querySelector('.stock-row-contract-val')?.textContent || '').trim();
                    const statusMatch = targetStatus === 'All' || rowStatus === targetStatus;
                    const contractMatch = targetContract === 'All' || contractVal === targetContract;
                    
                    if (statusMatch && contractMatch) {
                      row.style.display = ''; // Restore default display
                      groupHasVisibleRows = true;
                      sectionHasVisibleRows = true;
                    } else {
                      row.style.display = 'none';
                    }
                  });

                  // The header is the previous element sibling
                  const header = group.previousElementSibling;
                  if (header) {
                      header.style.display = groupHasVisibleRows ? 'flex' : 'none';
                      if (targetStatus !== 'All' && groupHasVisibleRows) {
                          group.style.display = 'block';
                          const icon = header.querySelector('.fa-chevron-right, .fa-chevron-down');
                          if (icon) icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
                      } else if (targetStatus === 'All') {
                          group.style.display = 'none';
                          const icon = header.querySelector('.fa-chevron-right, .fa-chevron-down');
                          if (icon) icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
                      }
                  }
              });

              // Only show the OEM section if it matches the brand AND has visible rows after status filtering AND matches company
          const oemMatch = targetOem === 'all' || secOem === targetOem;
          sec.style.display = (oemMatch && companyMatch && sectionHasVisibleRows) ? 'block' : 'none';
        });
      };

      window.updateStockBtn = function (btn) {
        if (!btn) return;
        // Determine if it's a brand filter or status filter
        if (btn.classList.contains('btn-stock-filter')) {
            document.querySelectorAll('.btn-stock-filter').forEach(b => b.classList.remove('active'));
        } else if (btn.classList.contains('btn-stock-status-filter')) {
            document.querySelectorAll('.btn-stock-status-filter').forEach(b => b.classList.remove('active'));
        }
        btn.classList.add('active');
      };

      window.renderArrivalCalendar = function (targetDate = null) {
        window._stockViewMode = 'calendar';
        if (targetDate) window._calendarMonth = targetDate;
        const container = document.getElementById('stock-tab-content');
        if (!container) return;

        const cache = localStorage.getItem('mxg_stock_pipeline_cache');
        let records = [];
        if (cache) { try { records = JSON.parse(cache).data; } catch (e) { } }

        const viewDate = window._calendarMonth || new Date();
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const currentMonthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        const arrivalsThisMonth = records.filter(r => r.eta_harare && r.eta_harare.startsWith(currentMonthStr));
        
        let machineSummary = {};
        let potentialCustomersList = [];
        
        arrivalsThisMonth.forEach(r => {
            const qty = (parseInt(r.quantity) || parseInt(r.proposed_order) || parseInt(r.proposed_order_quantity) || 1);
            if (!machineSummary[r.model]) machineSummary[r.model] = 0;
            machineSummary[r.model] += qty;
            
            if (r.potential_customers && Array.isArray(r.potential_customers)) {
                r.potential_customers.forEach(pc => {
                    if (pc.customer_name) {
                        const exists = potentialCustomersList.find(item => item.customer === pc.customer_name && item.machine === r.model);
                        if (!exists) {
                            potentialCustomersList.push({ customer: pc.customer_name, machine: r.model });
                        }
                    }
                });
            }
        });

        let sidebarHtml = `
            <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; display: flex; flex-direction: column; gap: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-height: 100%; overflow-y: auto;">
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 850; color: #0f172a;">Monthly Summary</h3>
                    <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 500;">Overview for ${monthName}</p>
                </div>
                
                <div>
                    <h4 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Machine Breakdown</h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${Object.keys(machineSummary).map(m => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${m}</span>
                                <span style="font-size: 12px; font-weight: 800; color: #1e40af; background: #dbeafe; padding: 2px 8px; border-radius: 12px;">${machineSummary[m]}</span>
                            </div>
                        `).join('')}
                        ${Object.keys(machineSummary).length === 0 ? '<div style="font-size: 13px; color: #94a3b8; font-style: italic;">No machines scheduled</div>' : ''}
                    </div>
                </div>

                <div>
                    <h4 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Potential Customers</h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${potentialCustomersList.map(pc => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                                <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #0f172a;">
                                    <i class="fas fa-user-circle" style="color: #cbd5e1; font-size: 16px;"></i> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;" title="${pc.customer}">${pc.customer}</span>
                                </div>
                                <span style="font-size: 9px; font-weight: 800; color: #64748b; background: white; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">${pc.machine}</span>
                            </div>
                        `).join('')}
                        ${potentialCustomersList.length === 0 ? '<div style="font-size: 13px; color: #94a3b8; font-style: italic;">No potential customers logged</div>' : ''}
                    </div>
                </div>
            </div>
        `;

        let upcomingHtml = '<div style="display: flex; gap: 12px; margin-top: 20px; overflow-x: auto; padding-bottom: 4px;">';
        for(let i=0; i<4; i++) {
           const sumDate = new Date();
           sumDate.setMonth(sumDate.getMonth() + i);
           const sumMonthStr = sumDate.toISOString().slice(0, 7);
           const mName = sumDate.toLocaleString('default', { month: 'short', year: 'numeric' });
           let totalUnits = 0;
           
           records.forEach(r => {
               if (r.eta_harare && r.eta_harare.startsWith(sumMonthStr)) {
                   totalUnits += (parseInt(r.quantity) || parseInt(r.proposed_order) || parseInt(r.proposed_order_quantity) || 0);
               }
           });
           
           upcomingHtml += `
             <div onclick="window.renderArrivalCalendar(new Date(${sumDate.getFullYear()}, ${sumDate.getMonth()}, 1))" 
                  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.1)'" 
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)'"
                  style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s;">
               <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">${mName}</div>
               <div style="font-size: 28px; font-weight: 900; color: #0f172a; line-height: 1; margin-bottom: 2px;">${totalUnits}</div>
               <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Units Arriving</div>
             </div>
           `;
        }
        upcomingHtml += '</div>';

        let html = `
          <div style="display: grid; grid-template-columns: 1fr 320px; gap: 24px; height: 100%; align-items: start;">
            <div style="display: flex; flex-direction: column; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="padding: 24px 32px; background: white; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h2 style="margin: 0; font-size: 24px; font-weight: 850; color: #0f172a; letter-spacing: -0.02em;">${monthName}</h2>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">Scheduled machinery arrivals for this month.</p>
                        </div>
                        <div style="display: flex; gap: 8px; background: #f1f5f9; padding: 4px; border-radius: 10px;">
                            <button onclick="window.renderArrivalCalendar(new Date(${year}, ${month - 1}, 1))" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; color: #1e293b; transition: all 0.2s;"><i class="fas fa-chevron-left"></i></button>
                            <button onclick="window.renderArrivalCalendar(new Date())" style="padding: 0 16px; height: 36px; font-size: 13px; font-weight: 700; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; color: #1e293b;">Today</button>
                            <button onclick="window.renderArrivalCalendar(new Date(${year}, ${month + 1}, 1))" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; color: #1e293b;"><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>
                    ${upcomingHtml}
                </div>
                
                <!-- Weekday Headers -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => `
                        <div style="padding: 12px; text-align: center; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${day}</div>
                    `).join('')}
                </div>

                <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: #e2e8f0; gap: 1px;">`;

        for (let i = 0; i < startOffset; i++) {
          html += `<div style="background: #f8fafc; min-height: 100px; position: relative; opacity: 0.5;"></div>`;
        }

        // Days Loop
        for (let d = 1; d <= daysInMonth; d++) {
          const dayDateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          const arrivals = records.filter(r => r.eta_harare === dayDateStr);
          const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

          html += `
                <div style="background: white; min-height: 100px; padding: 12px; position: relative; transition: all 0.2s;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                      <span style="font-weight: 850; font-size: 14px; color: ${isToday ? '#8b2219' : '#1e293b'}; ${isToday ? 'background: #fef2f2; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin: -4px;' : ''}">${d}</span>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${arrivals.map(r => {
            const safeData = JSON.stringify(r).replace(/'/g, "&#39;").replace(/`/g, "\\`").replace(/"/g, "&quot;");
            const safeName = (r.name || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, "\\n").replace(/\r/g, "");
            
            let earmarkHtml = '';
            if (r.potential_customers && r.potential_customers.length > 0) {
               // Show the first customer name, or "2 Customers" if multiple
               let pcLabel = r.potential_customers[0].customer_name;
               if (r.potential_customers.length > 1) {
                  pcLabel = `+${r.potential_customers.length} Cust`;
               }
               earmarkHtml = `<span style="font-size: 8px; font-weight: 800; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; margin-left: auto; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 60px;" title="${pcLabel}">${pcLabel}</span>`;
            }


            return `
                        <div onclick="showStockPipelineForm('${safeName}')" style="font-size: 10px; font-weight: 700; background: #eff6ff; color: #1e40af; border: 1px solid #dbeafe; padding: 6px 8px; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <span style="width: 4px; height: 4px; background: #3b82f6; border-radius: 50%; flex-shrink: 0;"></span>
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.model}</span>
                            ${earmarkHtml}
                        </div>`;
          }).join('')}
                  </div>
                </div>`;
        }

        // Fill end cells
        const totalCellsProcessed = startOffset + daysInMonth;
        const remainingCells = 7 - (totalCellsProcessed % 7);
        if (remainingCells < 7) {
          for (let i = 0; i < remainingCells; i++) {
            html += `<div style="background: #f8fafc; min-height: 100px; opacity: 0.5;"></div>`;
          }
        }

        html += `</div></div>
        ${sidebarHtml}
        </div>`;
        container.innerHTML = html;
      };


      bindOrdersEvents();

      // Initial fetch
      loadReport(); // Auto-load enabled

      function bindOrdersEvents() {
        const thead = document.getElementById('mxg-orders-head');
        if (thead) {
          // Sorting
          thead.addEventListener('click', (e) => {
            const th = e.target.closest('th[data-sort]');
            if (!th) return;
            const key = th.dataset.sort;
            if (S.ordersSort.key === key) {
              S.ordersSort.dir *= -1; // Toggle
            } else {
              S.ordersSort = { key: key, dir: 1 };
            }
            // Visual update for cursors/icons could be added here
            renderOrders();
          });
        }

        const filterBar = document.getElementById('mxg-orders-filters');
        if (filterBar) {
          // Filtering
          filterBar.addEventListener('input', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') return;
            const key = e.target.dataset.filter;
            if (!key) return;

            S.ordersFilter[key] = e.target.value.toLowerCase();
            renderOrders();
          });

          // Reset
          const resetBtn = document.getElementById('mxg-orders-reset');
          if (resetBtn) {
            resetBtn.addEventListener('click', () => {
              S.ordersFilter = {};
              filterBar.querySelectorAll('input, select').forEach(i => i.value = '');
              renderOrders();
            });
          }
        }
      }

      function renderOrders() {
        let list = (S.ordersData || []).filter(o => !((o.customer || '').includes('DIAGNOSTIC')));


        // 1. Filter
        Object.keys(S.ordersFilter).forEach(k => {
          const val = S.ordersFilter[k];
          if (val) {
            list = list.filter(o => {
              let fVal = (o[k] || '').toString().toLowerCase();
              return fVal.includes(val);
            });
          }
        });

        // 2. Smart AI Sort: Priority (Risk Score Desc, then Days Left Asc)
        list.sort((a, b) => {
          // Rule 1: Risk Score (Primary)
          const sa = parseFloat(a.risk_score) || 0;
          const sb = parseFloat(b.risk_score) || 0;
          if (sb !== sa) return sb - sa;

          // Rule 2: Days Left (Secondary)
          const da = parseFloat(a.days_left) || 999;
          const db = parseFloat(b.days_left) || 999;
          return da - db;
        });

        const container = document.getElementById('gsm-orders-grid-container'); // Isolated GSM target
        if (!container) return;

        // KPI Updates
        const effEl = document.getElementById('mxg-eff-val');
        const pendingEl = document.getElementById('mxg-pending-val-header');

        if (effEl || pendingEl) {
          let fTotal = 0, fOnTime = 0, fPending = 0;
          list.forEach(o => {
            const d = parseInt(o.days_left);
            if (!isNaN(d)) {
              fTotal++;
              if (d >= 0) fOnTime += 1.0;
              else fOnTime += Math.exp(-Math.abs(d) / 43.3);
            }
            if (!o.actual_handover) fPending++;
          });
          if (effEl) effEl.innerText = fTotal > 0 ? Math.round((fOnTime / fTotal) * 100) + '%' : '-';
          if (pendingEl) pendingEl.innerText = fPending;
        }

        if (list.length === 0) {
          container.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">No matching active orders found.</div>';
          return;
        }

        container.innerHTML = list.map((o, idx) => {
          const daysNum = parseInt(o.days_left);
          const riskLv = (o.risk_level || 'Low').toLowerCase();
          const riskIcon = riskLv === 'high' ? '🔥' : (riskLv === 'medium' ? '⚠️' : '✅');

          const escapeJs = (s) => (s || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, "\\n").replace(/\r/g, "");
          const safeReportId = escapeJs(o.report_id);
          const safeMachineId = escapeJs(o.machine_id);
          const safeNotes = escapeJs(o.notes);
          const safeInternalNotes = escapeJs(o.internal_notes);
          const safeRevisedHandover = escapeJs(o.revised_handover);

          const clickGuard = `if(window.salestrack && window.salestrack.openOrderModal) window.salestrack.openOrderModal('${safeReportId}', '${safeMachineId}'); else alert('Dashboard is still loading. Please wait a moment.');`;

          return `
          <div class="ai-order-row risk-${riskLv} ${riskLv === 'high' ? 'active-pulse' : ''}" 
               data-id="${o.report_id}">
            
            <!-- Checkbox Cell -->
            <div class="ai-order-cell" style="width: 40px; text-align: center; flex: 0 0 40px;" onclick="event.stopPropagation(); toggleOrderSelection('${safeReportId}')">
               <input type="checkbox" class="order-select-cb" data-id="${safeReportId}" style="width:16px; height:16px; cursor:pointer; pointer-events:none;" ${window.omnisSelectedOrders && window.omnisSelectedOrders.has(o.report_id) ? 'checked' : ''}>
            </div>

            <div class="ai-order-cell" onclick="${clickGuard}">
               <span class="cell-label">Customer</span>
               <div style="font-weight:700; color:#1e293b;">${(o.customer || '-').replace(/\"/g, '')}</div>
               <div class="ai-insight-badge ${riskLv}" title="${o.ai_rationale || ''}">
                  <span>${riskIcon}</span> ${o.risk_level || 'Stable'}
               </div>
            </div>

            <div class="ai-order-cell" onclick="${clickGuard}">
               <span class="cell-label">Machine</span>
               <div style="font-size:14px; font-weight:700; color:#0f172a; overflow:hidden; text-overflow:ellipsis;" title="${(o.machine || '').replace(/\"/g, '')}">${(o.machine || '-').replace(/\"/g, '')}</div>
            </div>

            <div class="ai-order-cell" style="text-align:center;" onclick="${clickGuard}">
               <span class="cell-label">Qty</span>
               <div style="font-weight:600;">${o.qty || 1}</div>
            </div>

            <div class="ai-order-cell" onclick="${clickGuard}">
               <span class="cell-label">Phase</span>
               <div class="status-pill blue" style="font-size:10px;">${o.status || 'Active'}</div>
            </div>

            <div class="ai-order-cell ai-note-cell" 
                 title="Double-click to edit notes"
                 ondblclick="editOrderField(this, '${safeMachineId}', 'notes', '${safeNotes}')">
               <span class="cell-label">Status</span>
               <div style="font-size:15px; color:#1e293b; font-weight:600; line-height:1.6;">${o.notes || '-'}</div>
            </div>

            <div class="ai-order-cell ai-note-cell" 
                 title="Double-click to edit internal notes"
                 ondblclick="editOrderField(this, '${safeMachineId}', 'internal_notes', '${safeInternalNotes}')">
               <span class="cell-label">🖋️ Internal Notes</span>
               <div class="ai-internal-notes-pill" 
                    style="line-height:1.6; font-size:14px; font-weight:500;">${o.internal_notes || '-'}</div>
            </div>

            <div class="ai-order-cell" onclick="${clickGuard}">
               <span class="cell-label">Committed LT</span>
               <div style="font-size:11px; color:#64748b; font-weight:600;">${o.committed_lead_time || '-'}</div>
            </div>

            <div class="ai-order-cell" onclick="${clickGuard}">
               <span class="cell-label">📅 Target Date</span>
               <div class="ai-date-pill" style="color:#1e293b;">${o.target_handover || '-'}</div>
            </div>

            <div class="ai-order-cell" 
                 title="Double-click to edit revised date"
                 ondblclick="editOrderField(this, '${safeMachineId}', 'revised_handover_date', '${safeRevisedHandover}')">
               <span class="cell-label">📍 Revised Date</span>
               <div class="ai-date-pill" style="color:#4338ca;">${o.revised_handover || '-'}</div>
            </div>

            <div class="ai-order-cell" style="text-align:center;" onclick="${clickGuard}">
               <span class="cell-label">Days Left</span>
               <div class="${daysNum < 0 ? 'days-neg' : 'days-pos'}" style="font-size:14px; font-weight:900;">${o.days_left || '0'}</div>
            </div>

            <div class="ai-order-row-actions" style="text-align:right;">
               <button class="btn-text-action" onclick="${clickGuard}">Details</button>
            </div>
          </div>`;
        }).join('');
      }
      window.renderOrders = renderOrders;
      window.loadGSMReport = loadReport;

      window.omnisSelectedOrders = new Set();
      window.toggleOrderSelection = function(reportId) {
          if (window.omnisSelectedOrders.has(reportId)) {
              window.omnisSelectedOrders.delete(reportId);
          } else {
              window.omnisSelectedOrders.add(reportId);
          }
          renderOrders();
          updateBulkActionBar();
      };
      
      function updateBulkActionBar() {
          let bar = document.getElementById('omnis-bulk-action-bar');
          if (!bar) {
              bar = document.createElement('div');
              bar.id = 'omnis-bulk-action-bar';
              bar.style.cssText = 'position:fixed; bottom:-100px; left:50%; transform:translateX(-50%); background:#fff; box-shadow:0 -4px 20px rgba(0,0,0,0.15); border-radius:12px 12px 0 0; padding:16px 24px; display:flex; align-items:center; gap:20px; z-index:9999; transition:bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid #e2e8f0; border-bottom: none;';
              document.body.appendChild(bar);
              
              bar.innerHTML = `
                  <div style="font-weight:600; color:#0f172a; font-size:15px; display:flex; align-items:center; gap:8px;"><span id="omnis-bulk-count" style="background:#ef4444; color:#fff; padding:2px 8px; border-radius:12px; font-size:13px;">0</span> Orders Selected</div>
                  <div style="width:1px; height:24px; background:#e2e8f0;"></div>
                  <select id="omnis-bulk-company-select" style="padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; outline:none; font-family:inherit; min-width:200px;">
                      <option value="">Select Company to Assign...</option>
                  </select>
                  <button onclick="window.executeBulkAssign()" style="background:#0f172a; color:#fff; padding:8px 20px; border-radius:6px; border:none; font-weight:600; cursor:pointer; transition:background 0.2s;">Assign</button>
                  <button onclick="window.clearBulkSelection()" style="background:transparent; color:#64748b; padding:8px 16px; border-radius:6px; border:none; font-weight:500; cursor:pointer;">Cancel</button>
              `;
          }
          
          if (window.omnisSelectedOrders.size > 0) {
              document.getElementById('omnis-bulk-count').textContent = window.omnisSelectedOrders.size;
              bar.style.bottom = '0';
              // Populate options if not populated
              const sel = document.getElementById('omnis-bulk-company-select');
              if (sel.options.length <= 1) {
                  const compSelect = document.getElementById('mxg-company-filter');
                  if (compSelect) {
                      Array.from(compSelect.options).forEach(opt => {
                          if (opt.value && opt.value !== 'all' && opt.value.toLowerCase() !== 'unassigned') {
                              const newOpt = document.createElement('option');
                              newOpt.value = opt.value;
                              newOpt.textContent = opt.textContent;
                              sel.appendChild(newOpt);
                          }
                      });
                  }
              }
          } else {
              bar.style.bottom = '-100px';
          }
      }
      
      window.clearBulkSelection = function() {
          window.omnisSelectedOrders.clear();
          renderOrders();
          updateBulkActionBar();
      };
      
      window.executeBulkAssign = async function() {
          const selectedCompany = document.getElementById('omnis-bulk-company-select').value;
          if (!selectedCompany) {
              alert("Please select a company to assign.");
              return;
          }
          
          if (!confirm(`Are you sure you want to assign ${window.omnisSelectedOrders.size} order(s) to ${selectedCompany}?`)) {
              return;
          }
          
          try {
              const promises = [];
              for (const reportId of window.omnisSelectedOrders) {
                  promises.push(window.electron.invoke('supabase:query', {
                      table: 'fmb_reports',
                      method: 'upsert',
                      data: { frappe_id: reportId, company: selectedCompany },
                      params: { onConflict: 'frappe_id', select: 'id' }
                  }));
              }
              await Promise.all(promises);
              
              if (window.omnisLog) window.omnisLog(`Assigned ${window.omnisSelectedOrders.size} orders to ${selectedCompany}`, 'success');
              
              window.clearBulkSelection();
              
              // Refresh data
              if (window.loadGSMReport) window.loadGSMReport(true);
              if (window.salestrack && window.salestrack.loadOrdersList) window.salestrack.loadOrdersList();
              
          } catch(e) {
              console.error("Bulk Assign Error", e);
              alert("Failed to assign orders. Check console for details.");
          }
      };


      let isPresentationMode = false;
      let focusedRowIndex = -1;

      function togglePresentationMode() {
        const container = document.querySelector('.mxg-page-3');
        const btn = document.getElementById('presentation-mode-btn');
        if (!container) return;
        isPresentationMode = !isPresentationMode;

        if (isPresentationMode) {
          container.classList.add('presentation-mode');
          try {
            if (container.requestFullscreen) container.requestFullscreen();
            else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
            else if (container.msRequestFullscreen) container.msRequestFullscreen();
          } catch (e) { console.warn("Fullscreen failed", e); }
          if (btn) {
            btn.innerHTML = '<span>❌</span> Exit Presentation';
            btn.style.background = '#ef4444'; btn.style.color = 'white'; btn.style.borderColor = '#ef4444';
          }
          if (focusedRowIndex === -1) focusOrderRow(container.querySelector('tbody tr'));
          document.addEventListener('keydown', handlePresentationNav);
        } else {
          container.classList.remove('presentation-mode');
          if (document.fullscreenElement) {
            try {
              if (document.exitFullscreen) document.exitFullscreen();
              else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
              else if (document.msExitFullscreen) document.exitFullscreen();
            } catch (e) { }
          }
          document.querySelectorAll('.presentation-mode tr.focused').forEach(r => r.classList.remove('focused'));
          if (btn) {
            btn.innerHTML = '<span>📺</span> Presentation Mode';
            btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = '';
          }
          document.removeEventListener('keydown', handlePresentationNav);
          hidePresentationQuickView();
          focusedRowIndex = -1;
        }
      }

      function focusOrderRow(tr) {
        if (!isPresentationMode || !tr) return;

        // Remove prev focus
        document.querySelectorAll('.presentation-mode tr.focused').forEach(r => r.classList.remove('focused'));

        // Set new focus
        tr.classList.add('focused');
        focusedRowIndex = parseInt(tr.getAttribute('data-row-index'));

        // Auto Scroll
        tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      window.focusOrderRow = focusOrderRow;

      function handlePresentationNav(e) {
        if (!isPresentationMode) return;
        const rows = document.querySelectorAll('.mxg-page-3 .mxg-table-wrapper tbody tr');
        if (rows.length === 0) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          let nextIdx = focusedRowIndex + 1;
          if (nextIdx >= rows.length) nextIdx = 0; // loop or stop? Let's loop.
          focusOrderRow(rows[nextIdx]);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          let prevIdx = focusedRowIndex - 1;
          if (prevIdx < 0) prevIdx = rows.length - 1;
          focusOrderRow(rows[prevIdx]);
        } else if (e.key === 'Escape') {
          const modal = document.getElementById('pq-modal');
          if (modal && modal.classList.contains('active')) {
            hidePresentationQuickView();
          } else {
            togglePresentationMode();
          }
        }
      }

      function showPresentationQuickView(o) {
        if (!isPresentationMode) return;
        const modal = document.getElementById('pq-modal');
        const overlay = document.getElementById('pq-overlay');
        if (!modal || !overlay) return;

        document.getElementById('pq-customer').textContent = o.customer || '-';
        document.getElementById('pq-machine').textContent = o.machine || '-';
        document.getElementById('pq-status').textContent = o.status || 'In Progress';
        document.getElementById('pq-date').textContent = (o.order_date || '').split(' ')[0] || '-';
        document.getElementById('pq-target').textContent = o.target_handover || o.revised_handover || '-';

        const daysEl = document.getElementById('pq-days');
        const days = parseInt(o.days_left);
        daysEl.textContent = o.days_left || '0';
        daysEl.style.color = (days < 0) ? '#ef4444' : '#22c55e';

        document.getElementById('pq-notes').textContent = o.notes || 'No detailed notes available for this order.';

        modal.classList.add('active');
        overlay.classList.add('active');
      }

      function hidePresentationQuickView() {
        const modal = document.getElementById('pq-modal');
        const overlay = document.getElementById('pq-overlay');
        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
      }

      // Modal overlay click listener
      document.getElementById('pq-overlay')?.addEventListener('click', hidePresentationQuickView);

      function setPage(p) {
        S.page = p;
        // Update tabs
        E.tabs.forEach(btn => {
          const bp = parseInt(btn.dataset.page || "1");
          if (bp === p) btn.classList.add('mxg-page-btn-active');
          else btn.classList.remove('mxg-page-btn-active');
        });

        // Update visibility
        Object.keys(E.pages).forEach(k => {
          const pageNum = parseInt(k);
          if (E.pages[k]) E.pages[k].style.display = (pageNum === p) ? 'block' : 'none';
        });

        // FIX FOR INDEPENDENT SCROLLING
        const mvc = document.getElementById('main-view-container');
        if (mvc) {
          // ONLY apply gsm-mode-active if the report view itself is visible
          // This prevents background loadReport calls from hijacking the dashboard scroll
          const isReportVisible = !document.getElementById('view-salestrack-reports').classList.contains('hidden');
          if (p === 2 && isReportVisible) {
            mvc.classList.add('gsm-mode-active');
          } else {
            mvc.classList.remove('gsm-mode-active');
          }
        }

        if (p === 3) renderOrders();
        if (p === 8) window.loadProductsFromSupabase();
      }

      async function loadReport(force = false) {
        try {
          S.loading = true;
          const company = document.getElementById('mxg-company-filter')?.value || 'all';
          const cacheKey = `mxg_gsm_cache_${company}`;
          if (force) localStorage.removeItem(cacheKey);

          const cached = localStorage.getItem(cacheKey);
          if (cached && !force) {
            try {
              const entry = JSON.parse(cached);
              omnisLog("[Cache] Rendering GSM Report...");
              S.data = entry.data;
              render(entry.data);

              const age = Date.now() - entry.timestamp;
              if (age < 12 * 60 * 60 * 1000) {
                omnisLog("[Cache] Data is fresh.");
                S.loading = false;
                return;
              }
            } catch (e) { console.warn("Cache parse failed", e); }
          }

          const tbody3 = document.getElementById('gsm-orders-grid-container');
          if (tbody3) tbody3.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;"><div class="spin" style="display:inline-block; width:20px; height:20px; border:2px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; animation:spin 1s linear infinite;"></div> Synchronizing AI Engine...</div>';

          omnisLog(`[Network] GSM Report Fetch: Company='${company}'`);
          const method = "powerstar_salestrack.omnis_dashboard.get_weekly_gsm_report";
          const isUnassigned = company.toLowerCase() === 'unassigned';
          const args = {
            company: (company === 'all' || isUnassigned) ? '' : company,
            from_date: document.getElementById('mxg-from-date')?.value,
            to_date: document.getElementById('mxg-to-date')?.value
          };

          const baseUrl = window.CURRENT_SYSTEM ? window.CURRENT_SYSTEM.baseUrl : "https://salestrack.powerstar.co.zw";
          const res = await window.callFrappeSequenced(baseUrl, method, args);
          const data = res.message || res;

          if (data && (data.ok || data.current_orders || (data.rows && data.rows.length > 0))) {
            // Augment with Supabase Company assignment
            try {
                if (data.current_orders && window.electron && window.electron.invoke) {
                    const sbRes = await window.electron.invoke('supabase:query', {
                        table: 'fmb_reports', method: 'select', params:{columns:'frappe_id, company'}
                    });
                    if(sbRes.ok && sbRes.data) {
                        const compMap = new Map();
                        sbRes.data.forEach(d => { if (d.company) compMap.set(d.frappe_id, d.company); });
                        data.current_orders.forEach(o => {
                            if (compMap.has(o.report_id)) o.company = compMap.get(o.report_id);
                        });
                        if (data.orders) {
                            data.orders.forEach(o => {
                                if (compMap.has(o.report_id)) o.company = compMap.get(o.report_id);
                            });
                        }
                    }
                }
            } catch(e) { console.error('[Omnis] Failed to augment company from Supabase', e); }

            const normalizeCompany = (c) => {
                if (!c) return "Unassigned";
                const cl = c.toLowerCase();
                // Check more specific term first to avoid misclassification
                if (cl.includes("machinery exchange") || cl === "machinery") return "Machinery Exchange";
                if (cl.includes("sinopower")) return "Sinopower";
                if (cl.includes("everstar")) return "Everstar Industries";
                if (cl.includes("powerstar") || cl.includes("power star") || cl.includes("powerstar ft")) return "Everstar Industries";
                return "Unassigned";
            };

            if (data.current_orders) {
                data.current_orders.forEach(o => { o.company = normalizeCompany(o.company); });
            }
            if (data.orders) {
                data.orders.forEach(o => { o.company = normalizeCompany(o.company); });
            }

            if (data.current_orders && window.appendMissingCompanyFilters) {
                const frappeCompanies = [...new Set(data.current_orders.map(o => o.company).filter(Boolean))];
                window.appendMissingCompanyFilters(frappeCompanies);
            }
            // Frontend filter if Unassigned was requested (since we passed empty string to backend)
            if (isUnassigned) {
                if (data.current_orders) {
                    data.current_orders = data.current_orders.filter(o => o.company === 'Unassigned');
                }
                if (data.orders) {
                    data.orders = data.orders.filter(o => o.company === 'Unassigned');
                }
                // Note: data.rows (aggregated metrics) can't easily be filtered here because they are pre-aggregated, 
                // but at least the orders list will be correct.
            }
            S.data = data;
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: data }));
            render(data);
          } else {
            omnisLog("GSM Report synchronized but returned no rows.", "info");
            // Still render with empty data to clear the "Initialising" state if possible
            if (data && data.rows) render(data);
          }
        } catch (err) {
          console.error("GSM Report Error:", err);
          const tbody3 = document.getElementById('gsm-orders-grid-container');
          if (tbody3) tbody3.innerHTML = `<div style="color:#ef4444; text-align:center; padding:20px;">AI Analysis Offline: ${err.message}</div>`;
        } finally {
          S.loading = false;
        }
      }

      function render(data) {
        if (!data) return;

        // 1. KPIs
        // 1. KPIs
        const kpi = data.kpi || data.kpis; // Handle potential key mismatch
        if (kpi) {
          // OVERRIDE for Machinery Exchange as requested
          const selectedCompany = document.getElementById('mxg-company-filter')?.value;
          if (selectedCompany === 'machinery') {
            kpi.mtd_target = 18;
            kpi.ytd_target = 216;

            // Re-calc percentages based on live actuals vs new targets
            const mtdActual = kpi.mtd_sales ?? kpi.mtd_actual ?? 0;
            const ytdActual = kpi.ytd_sales ?? kpi.ytd_actual ?? 0;

            kpi.mtd_percent = kpi.mtd_target > 0 ? Math.round((mtdActual / kpi.mtd_target) * 100) : 0;
            kpi.ytd_percent = kpi.ytd_target > 0 ? Math.round((ytdActual / kpi.ytd_target) * 100) : 0;
          }

          // YTD
          const ytdVal = fmtMoney(kpi.ytd_sales ?? kpi.ytd_actual ?? 0);
          const ytdTgt = fmtMoney(kpi.ytd_target || 0);
          setText('mxg-kpi-ytd', `${ytdVal} / ${ytdTgt}`);
          setText('mxg-kpi-ytd-percent', `${kpi.ytd_percent}% of yearly target`);

          // MTD
          const mtdVal = fmtMoney(kpi.mtd_sales ?? kpi.mtd_actual ?? 0);
          const mtdTgt = fmtMoney(kpi.mtd_target || 0);
          setText('mxg-kpi-mtd', `${mtdVal} / ${mtdTgt}`);
          setText('mxg-kpi-mtd-percent', `${kpi.mtd_percent}% of monthly target`);

          const variance = parseFloat(kpi.mtd_variance || 0);
          const varEl = document.getElementById('mxg-kpi-mtd-var');
          if (varEl) {
            varEl.textContent = fmtMoney(variance);
            varEl.style.color = variance >= 0 ? '#10b981' : '#ef4444';
          }

          setText('mxg-kpi-weekly-needed', fmtMoney(kpi.weekly_needed));
          setText('mxg-kpi-weeks-remaining', `${kpi.weeks_remaining} weeks remaining`);
        }

        const tbody = document.querySelector('.mxg-body-p1-grid');
        if (tbody && data.rows && Array.isArray(data.rows)) {
          // Initialize totals
          let totals = { ce: 0, pending: 0, quotes: 0, psv: 0, cdv: 0, fcdv: 0, hot: 0, lost: 0, hand: 0, sales: 0 };
          const rowCount = data.rows.length;

          // Calculate sums
          data.rows.forEach(r => {
            totals.ce += parseInt(r.ce_actual || 0);
            totals.pending += parseInt(r.pending || 0);
            totals.quotes += parseInt(r.quotes_actual || 0);
            totals.psv += parseInt(r.psv || 0);
            totals.cdv += parseInt(r.cdv || 0);
            totals.fcdv += parseInt(r.fcdv || 0);
            totals.hot += parseInt(r.hot_leads || 0);
            totals.lost += parseInt(r.lost_sales || 0);
            totals.hand += parseInt(r.handovers || 0);
            totals.sales += parseFloat(r.sales || 0);
          });

          // Helper for cell targets
          const withTarget = (val, target, isTotal = false) => {
            const v = parseInt(val || 0);
            const t = isTotal ? target * rowCount : target;
            const isUnder = v < t;
            const style = isUnder ? 'color:#ef4444; font-weight:700;' : '';
            return `<span style="${style}">${v}</span><span class="target-val">/ ${t}</span>`;
          };

          const rowsHtml = data.rows.map(row => `
        <tr>
          <td style="font-weight:700; color:#1e293b;">${row.salesperson_label || row.salesperson}</td>
          <td onclick="openGsmDetail('${row.salesperson}', 'ce')" style="cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">${withTarget(row.ce_actual, 20)}</td>
          <td onclick="openGsmDetail('${row.salesperson}', 'pending')" style="cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">${row.pending || 0}</td>
          <td onclick="openGsmDetail('${row.salesperson}', 'quotes')" style="cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">${withTarget(row.quotes_actual, 20)}</td>
          <td>${withTarget(row.psv, 8)}</td>
          <td>${withTarget(row.cdv, 8)}</td>
          <td>${withTarget(row.fcdv, 2)}</td>
          <td onclick="openGsmDetail('${row.salesperson}', 'hot')" style="cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">${row.hot_leads || 0}</td>
          <td>${row.lost_sales || 0}</td>
          <td>${row.handovers || 0}</td>
          <td class="text-right" style="font-weight:800; color:#0f172a; cursor:pointer;" onclick="openGsmDetail('${row.salesperson}', 'sales')">${fmtMoney(row.sales)}</td>
        </tr>
      `).join('');

          // Expose detail opener
          window.openGsmDetail = async function (salesperson, category) {
            if (!window.salestrack || !window.salestrack.openListModal) {
              console.error("Dashboard Manager not ready");
              return;
            }

            if (!category) return;

            let displayTitle = category.toUpperCase();
            if (category === 'ce') displayTitle = "TOTAL CE'S (QUOTES + PENDING)";
            if (category === 'hot') displayTitle = "HOT LEADS";

            const title = `${displayTitle} - ${salesperson}`;
            window.salestrack.openListModal(title, '<div class="ai-loading">Loading details...</div>');

            try {
              const fromDate = document.getElementById('mxg-from-date')?.value;
              const toDate = document.getElementById('mxg-to-date')?.value;
              const company = document.getElementById('mxg-company-filter')?.value || "all";

              let baseUrl = "https://salestrack.powerstar.co.zw";
              if (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.baseUrl) {
                baseUrl = window.CURRENT_SYSTEM.baseUrl;
              }

              // --- SPECIAL LOGIC FOR CE (Combined) ---
              if (category === 'ce') {
                const p1 = window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.get_weekly_gsm_drilldown", {
                  metric: 'pending', salesperson, from_date: fromDate, to_date: toDate, company
                });
                const p2 = window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.get_weekly_gsm_drilldown", {
                  metric: 'quotes', salesperson, from_date: fromDate, to_date: toDate, company
                });

                const [r1, r2] = await Promise.all([p1, p2]);

                const list1 = (r1.message || r1).rows || []; // Pending
                const list2 = (r2.message || r2).rows || []; // Quotes

                // Tag them
                list1.forEach(i => i._tag = 'Pending'); // Opps
                list2.forEach(i => i._tag = 'Quote');   // Quotes

                const combined = [...list1, ...list2];
                // Sort by date desc
                combined.sort((a, b) => new Date(b.date) - new Date(a.date));

                renderDrilldownList(title, combined);
                return;
              }

              // --- STANDARD LOGIC ---
              let metric = category;
              if (category === 'hot') metric = 'hot_leads';

              const res = await window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.get_weekly_gsm_drilldown", {
                metric: metric,
                salesperson: salesperson,
                from_date: fromDate,
                to_date: toDate,
                company: company
              });

              const response = res.message || res;
              if (!response.ok) {
                window.salestrack.openListModal(title, `<div style="padding:20px; color:#ef4444;">${response.message || 'Error fetching data'}</div>`);
                return;
              }

              if (category === 'hot') {
                renderHotLeadsList(title, response.rows || []);
              } else {
                renderDrilldownList(title, response.rows || [], response.open_url);
              }

            } catch (e) {
              console.error(e);
              window.salestrack.openListModal(title, `<div style="padding:20px; color:#ef4444;">Error fetching data: ${e.message}</div>`);
            }
          };

          // Auto-save debounce
          let saveTimeout = null;
          window.saveHotLead = function (name, field, value) {
            // Show saving...
            const statusEl = document.getElementById('status-' + name);
            if (statusEl) statusEl.textContent = "Saving...";

            // Find existing data object in DOM if needed, or just send payload
            const payload = { name: name };
            payload[field] = value;

            if (window.callFrappe) {
              const baseUrl = (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.baseUrl) || "https://salestrack.powerstar.co.zw";
              window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.update_hot_lead", payload)
                .then(r => {
                  if (statusEl) statusEl.textContent = "Saved";
                  setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 2000);
                })
                .catch(e => {
                  console.error(e);
                  if (statusEl) statusEl.textContent = "Error";
                });
            }
          }

          function renderHotLeadsList(title, list) {
            if (!list || list.length === 0) {
              window.salestrack.openListModal(title, `<div style="padding:24px; text-align:center; color:#64748b;">No Hot Leads found.</div>`);
              return;
            }

            const html = `
            <div style="display:flex; flex-direction:column; gap:0; background:#f8fafc;">
                ${list.map(item => {
              return `
                    <div style="padding:16px; border-bottom:1px solid #e2e8f0; background:white; margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <div>
                                <div style="font-weight:700; color:#1e293b; font-size:14px;">${item.customer || item.name}</div>
                                <div style="font-size:12px; color:#64748b; margin-top:2px;">${item.equipment || "No Equipment Specified"}</div>
                            </div>
                            <div id="status-${item.name}" style="font-size:10px; color:#10b981; font-weight:600;"></div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="font-size:10px; color:#94a3b8; font-weight:600;">TED</label>
                                <input type="date" value="${item.ted}"
                                    style="width:100%; border:1px solid #e2e8f0; border-radius:4px; padding:4px; font-size:12px; color:#334155;"
                                    onchange="saveHotLead('${item.name}', 'ted', this.value)">
                            </div>
                            <div>
                                <label style="font-size:10px; color:#94a3b8; font-weight:600;">STATUS</label>
                                <select
                                    style="width:100%; border:1px solid #e2e8f0; border-radius:4px; padding:4px; font-size:12px; color:#334155; background:white;"
                                    onchange="saveHotLead('${item.name}', 'status', this.value)">
                                    <option value="Open" ${(!item.status || item.status === 'Open') ? 'selected' : ''}>Open</option>
                                    <option value="Acquitted" ${item.status === 'Acquitted' ? 'selected' : ''}>Acquitted</option>
                                    <option value="Quoted" ${item.status === 'Quoted' ? 'selected' : ''}>Quoted</option>
                                </select>
                            </div>
                        </div>

                        <div>
                             <label style="font-size:10px; color:#94a3b8; font-weight:600;">NOTES</label>
                             <textarea
                                style="width:100%; border:1px solid #e2e8f0; border-radius:4px; padding:6px; font-size:12px; height:60px; resize:vertical; font-family:inherit; color:#334155;"
                                onchange="saveHotLead('${item.name}', 'notes', this.value)"
                                placeholder="Add notes here...">${item.notes || ""}</textarea>
                        </div>
                    </div>
                    `;
            }).join('')}
            </div>
        `;
            window.salestrack.openListModal(title, html);
          }

          function renderDrilldownList(title, list, baseOpenUrl) {
            if (!list || list.length === 0) {
              window.salestrack.openListModal(title, `<div style="padding:24px; text-align:center; color:#64748b;">No records found.</div>`);
              return;
            }

            const html = `
            <div style="display:flex; flex-direction:column; gap:0;">
                ${list.map(item => {
              // Dynamic card generation
              const top = item.customer || item.name;
              const sub = item.date || "";
              let sub2 = item.status || item.type || (item.total ? Number(item.total).toLocaleString() : "") || (item.qty ? Number(item.qty) + " qty" : "") || "";

              // Add Tag if present
              if (item._tag) sub2 = `<span style="font-size:10px; background:#eff6ff; color:#1d4ed8; padding:2px 6px; border-radius:99px; margin-right:6px;">${item._tag}</span>` + sub2;

              // Extra detail for Hot Leads (fallback) or Quote Items
              let extra = "";

              // 1. Show Quote Items if available
              if (item.items && item.items.length > 0) {
                extra += `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed #f1f5f9;">`;
                extra += `<div style="font-size:10px; font-weight:700; color:#94a3b8; margin-bottom:4px; letter-spacing:0.03em;">ITEMS QUOTED</div>`;
                extra += `<table style="width:100%; border-collapse:collapse; font-size:11px; color:#475569;">`;
                item.items.forEach(it => {
                  extra += `
                   <tr>
                     <td style="padding:2px 0; vertical-align:top;">
                       <div style="font-weight:600; color:#334155;">${it.item_name || it.item_code}</div>
                       ${it.item_name !== it.item_code ? `<div style="font-size:10px; color:#94a3b8;">${it.item_code}</div>` : ''}
                     </td>
                     <td style="padding:2px 0; vertical-align:top; text-align:right; width:40px; white-space:nowrap;">x ${Number(it.qty).toLocaleString()}</td>
                     <td style="padding:2px 0; vertical-align:top; text-align:right; width:80px; font-weight:500;">$${Number(it.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                   </tr>
                 `;
                });
                extra += `</table></div>`;
              }

              // 2. Show Note if present (fallback for Hot Leads)
              if (item.notes) {
                extra += `<div style="font-size:11px; color:#475569; margin-top:4px; font-style:italic;">"${item.notes}"</div>`;
              }

              return `
                    <div style="padding:12px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.2s;"
                         onclick="if(window.openInApp) window.openInApp('${baseOpenUrl || ''}', '${item.name}')"
                         onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <div>
                                <div style="font-weight:600; color:#1e293b;">${top}</div>
                                <div style="font-size:11px; color:#64748b;">${item.name} &bull; ${sub}</div>
                                ${extra}
                            </div>
                            <div style="font-weight:700; color:#0f172a; font-size:12px; text-align:right;">
                                ${sub2}
                            </div>
                        </div>
                    </div>
                    `;
            }).join('')}
            </div>
        `;
            window.salestrack.openListModal(title, html);
          }
          // Totals Row
          const totalsHtml = `
        <tr class="totals-row">
            <td>TOTAL</td>
             <td>${withTarget(totals.ce, 20, true)}</td>
             <td>${totals.pending}</td>
             <td>${withTarget(totals.quotes, 20, true)}</td>
             <td>${withTarget(totals.psv, 8, true)}</td>
             <td>${withTarget(totals.cdv, 8, true)}</td>
             <td>${withTarget(totals.fcdv, 2, true)}</td>
             <td>${totals.hot}</td>
             <td>${totals.lost}</td>
             <td>${totals.hand}</td>
             <td class="text-right">${fmtMoney(totals.sales)}</td>
        </tr>`;

          tbody.innerHTML = rowsHtml + totalsHtml;
        }

        // 3. Salesperson Cards (Page 2)
        const grid2 = document.querySelector('.mxg-page2-grid-sp');
        if (grid2 && data.rows) {
          grid2.innerHTML = data.rows.map(row => `
        <div class="mxg-kpi-card" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
           <div style="display: flex; align-items: flex-start; justify-content: space-between;">
             <div>
               <div style="font-weight:900; font-size:18px; color:#0f172a; margin-bottom: 2px;">${row.salesperson_label || row.salesperson}</div>
               <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.04em;">Sales Representative</div>
             </div>
             <div style="background:#f1f5f9; padding:4px 10px; border-radius:99px; font-size:11px; font-weight:800; color:#1e293b;">
               #${(data.rows.indexOf(row) + 1)} Rank
             </div>
           </div>

           <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
             <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #f1f5f9;">
               <div style="font-size:10px; color:#94a3b8; font-weight:700; margin-bottom:4px; text-transform:uppercase;">Gross Sales</div>
               <div style="font-size:16px; font-weight:800; color:#1e293b;">${fmtMoney(row.sales)}</div>
             </div>
             <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #f1f5f9;">
               <div style="font-size:10px; color:#94a3b8; font-weight:700; margin-bottom:4px; text-transform:uppercase;">Quotations</div>
               <div style="font-size:16px; font-weight:800; color:#1e293b;">${row.quotes_actual || 0}</div>
             </div>
           </div>

           <div>
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
               <span style="font-size:11px; font-weight:700; color:#64748b;">Target Progress</span>
               <span style="font-size:11px; font-weight:800; color:#0f172a;">${Math.min(100, Math.round(((row.sales || 0) / (row.sales_target || 1000000)) * 100))}%</span>
             </div>
             <div style="height:6px; background:#f1f5f9; border-radius:99px; overflow:hidden;">
               <div style="height:100%; width:${Math.min(100, Math.round(((row.sales || 0) / (row.sales_target || 1000000)) * 100))}%; background:linear-gradient(90deg, #4f46e5, #8b5cf6); border-radius:99px;"></div>
             </div>
           </div>

           <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
             <div style="font-size:11px; color:#64748b;"><span style="font-weight:800; color:#1e293b;">${row.hot_leads || 0}</span> Hot Leads</div>
             <div style="font-size:11px; color:#64748b;"><span style="font-weight:800; color:#1e293b;">${row.pending_ce || 0}</span> Pending CEs</div>
           </div>
        </div>
      `).join('');
        }

        // 4. Current Orders (Page 3)
        // Assuming backend returns 'orders' list
        const tbody3 = document.getElementById('gsm-orders-grid-container');
        const orders = data.current_orders || data.orders;
        S.ordersData = orders || [];
        if (window.salestrack) window.salestrack.ordersData = S.ordersData;


        if (tbody3) {
          // AI Insight Logic removed, just updating the inline KPIs
          if (S.ordersData) {
            const validOrders = S.ordersData.filter(o => o.target_handover || o.lead_time);
            const pending = validOrders.length;
            const onTrack = validOrders.filter(o => parseInt(o.days_left) >= 0).length;
            const efficiency = pending > 0 ? Math.round((onTrack / pending) * 100) : 0;

            if (document.getElementById('mxg-pending-val')) document.getElementById('mxg-pending-val').innerText = pending;
            if (document.getElementById('mxg-pending-val-header')) document.getElementById('mxg-pending-val-header').innerText = pending;
            if (document.getElementById('mxg-eff-val')) document.getElementById('mxg-eff-val').innerText = efficiency + '%';
            if (document.getElementById('mxg-eff-val-header')) document.getElementById('mxg-eff-val-header').innerText = efficiency + '%';
          }

          renderOrders();
        }
      }

      // Helpers
      // Defined globally at the top for early availability

      function fmtMoney(val) {
        if (val === undefined || val === null) return '-';
        return Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 }); // Removed currency style
      }

      window.editOrderField = function (el, machineId, field, currentVal) {
        // Find the content container (the div that isn't the label)
        const contentDiv = el.querySelector('div:not(.cell-label)');
        if (!contentDiv || contentDiv.querySelector('.inline-editor')) return;

        const originalContent = contentDiv.innerHTML;
        let inputHtml = '';

        if (field === 'revised_handover_date') {
          inputHtml = `<input type="date" class="inline-editor" value="${currentVal}" style="width:100%; border:1px solid #3b82f6; border-radius:4px; padding:4px; font-family:inherit; font-size:11px; outline:none;" onblur="saveOrderFieldInline(this, '${machineId}', '${field}', '${btoa(unescape(encodeURIComponent(originalContent)))}')" onkeydown="if(event.key==='Enter') this.blur()">`;
        } else {
          const rows = field === 'internal_notes' ? 4 : 3;
          inputHtml = `<textarea class="inline-editor" rows="${rows}" style="width:100%; padding:8px; border:2px solid #3b82f6; border-radius:6px; background:#fff; font-family:inherit; font-size:13px; color:#1e293b; outline:none; resize:vertical; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" onblur="saveOrderFieldInline(this, '${machineId}', '${field}', '${btoa(unescape(encodeURIComponent(originalContent)))}')" onkeydown="if(event.key==='Enter' && !event.shiftKey) this.blur()">${currentVal}</textarea>`;
        }

        contentDiv.innerHTML = inputHtml;
        const input = contentDiv.querySelector('.inline-editor');
        if (input) {
          input.focus();
          if (input.tagName === 'TEXTAREA') {
            const len = input.value.length;
            input.setSelectionRange(len, len);
          }
        }
      };

      window.saveOrderFieldInline = async function (input, machineId, field, b64Original) {
        const contentDiv = input.parentElement;
        const el = contentDiv.parentElement;
        const newVal = input.value.trim();
        const originalHtml = decodeURIComponent(escape(atob(b64Original)));

        // Strip HTML to get raw text for comparison if needed, but here we can just use currentVal if we passed it.
        // For simplicity, if value hasn't changed, just revert.
        // We'll trust the user and just check against the input's default if we had it, 
        // but since we refresh on change usually, this is fine.

        contentDiv.innerHTML = '<div style="font-size:12px; color:#3b82f6; font-style:italic; padding:4px;">Saving...</div>';

        try {
          let res;
          if (machineId.startsWith('TRACK-')) {
            let dbId = machineId.startsWith('TRACK-M-') ? machineId.split('-')[2] : machineId.split('-')[1];
            let dbField = field;
            if (field === 'revised_handover_date') dbField = 'revised_handover';

            res = await window.electron.invoke('supabase:query', {
              table: 'omnis_tracking_orders',
              method: 'update',
              params: { data: { [dbField]: newVal }, filters: { id: dbId } }
            });
          } else {
            const baseUrl = window.CURRENT_SYSTEM ? window.CURRENT_SYSTEM.baseUrl : "https://salestrack.powerstar.co.zw";
            let rawRes = await window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.update_fmb_machine_field", {
              machine_id: machineId,
              field: field,
              value: newVal
            });
            let payload = rawRes.message || rawRes;
            res = { ok: payload && payload.ok, error: payload?.error };
          }

          if (res && res.ok !== false) {
            // Success: Update UI with new value and appropriate styling
            if (field === 'revised_handover_date') {
              contentDiv.innerHTML = `<div class="ai-date-pill" style="color:#4338ca;">${newVal || '-'}</div>`;
            } else if (field === 'internal_notes') {
              contentDiv.innerHTML = `<div class="ai-internal-notes-pill" style="line-height:1.6; font-size:14px; font-weight:500;">${newVal || '-'}</div>`;
            } else {
              contentDiv.innerHTML = `<div style="font-size:15px; color:#1e293b; font-weight:600; line-height:1.6;">${newVal || '-'}</div>`;
            }

            // Re-bind the double click value for next time
            const escapedNewVal = newVal.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, "\\n").replace(/\r/g, "");
            el.setAttribute('ondblclick', `editOrderField(this, '${machineId}', '${field}', '${escapedNewVal}')`);

            if (window.showToast) window.showToast("Saved successfully", "success");
            else if (window.salestrack && window.salestrack.showToast) window.salestrack.showToast("Saved successfully", "success");
          } else {
            throw new Error(res?.error || "Save failed");
          }
        } catch (err) {
          console.error("Inline Save Error:", err);
          contentDiv.innerHTML = originalHtml;
          const errMsg = err.message || "Connection Error";
          if (window.showToast) window.showToast(errMsg, "error");
          else if (window.salestrack && window.salestrack.showToast) window.salestrack.showToast(errMsg, "error");
        }
      };

      // --- PRODUCT CATALOG LOGIC ---
    window.loadProductsFromSupabase = async function (force = false) {
        const grid = document.getElementById('product-catalog-grid');
        if (!grid) return;
        
        grid.innerHTML = `<div style="grid-column:1/-1; padding:100px; text-align:center;"><i class="fa fa-spinner fa-spin" style="font-size:32px; color:#ef4444; margin-bottom:16px;"></i><div style="font-weight:700; color:#64748b;">Loading local catalog...</div></div>`;

        try {
            // We use the same name but fetch from local cache via Electron bridge
            const response = await window.cacheAPI.getAll('products');
            const data = (response && response.ok) ? response.data : [];
            
            // Wait a tiny bit for UX
            await new Promise(r => setTimeout(r, 400));

            window._fullCatalog = data;
            renderProductsGrid(window._fullCatalog);
            
            if (window.omnisLog) {
               const count = window._fullCatalog.length;
               window.omnisLog(`Catalog loaded: ${count} items`, "info");
            }
        } catch(e) {
            console.error("Catalog Load Error:", e);
            grid.innerHTML = `<div style="grid-column:1/-1; padding:50px; color:#ef4444; font-weight:700; text-align:center;">
                <i class="fas fa-exclamation-triangle" style="font-size:24px; margin-bottom:12px;"></i><br>
                Cache Load Error: ${e.message}
            </div>`;
        }
    };

    window.renderProductsGrid = function (data) {
        const grid = document.getElementById('product-catalog-grid');
        if (!grid) return;

        if (!data || data.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; padding:100px; text-align:center; color:#94a3b8;"><i class="fas fa-boxes" style="font-size:48px; margin-bottom:16px; opacity:0.3;"></i><div style="font-size:18px; font-weight:700;">Catalog Empty</div><div style="font-size:12px; margin-top:8px;">Syncing with cloud in background...</div></div>`;
            return;
        }

        grid.innerHTML = data.map(p => {
            const img = p.image_url || 'https://placehold.co/400x300/f8fafc/94a3b8?text=No+Image';
            const rate = p.rate ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.rate) : 'POA';
            
            return `
                <div class="product-card" onclick="window.editProduct('${p.id}')" style="background:white; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden; transition:all 0.3s; display:flex; flex-direction:column; position:relative; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); cursor:pointer;">
                    <div style="position:absolute; top:12px; right:12px; display:flex; gap:6px; z-index:5;">
                        <button onclick="event.stopPropagation(); window.openProductPricing('${p.id}', '${p.item_name}', '${p.brand_name}', '${p.frappe_id}')" style="background:rgba(255,255,255,0.9); border:none; width:32px; height:32px; border-radius:8px; color:#10b981; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);" title="Pricing Calculator"><i class="fas fa-dollar-sign"></i></button>
                        <button onclick="event.stopPropagation(); window.deleteProductFromSupabase('${p.id}')" style="background:rgba(255,255,255,0.9); border:none; width:32px; height:32px; border-radius:8px; color:#ef4444; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <div style="height:180px; background:#f8fafc; display:flex; align-items:center; justify-content:center; overflow:hidden; border-bottom:1px solid #f1f5f9;">
                        <img src="${img}" style="width:100%; height:100%; object-fit:contain; padding:20px;" onerror="this.src='https://placehold.co/400x300/f8fafc/94a3b8?text=Image+Error'">
                    </div>
                    <div style="padding:20px; flex:1; display:flex; flex-direction:column;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                            <div style="font-size:10px; font-weight:800; color:#ef4444; text-transform:uppercase; letter-spacing:0.05em;">${p.brand_name || 'Generic'}</div>
                            <div style="font-size:14px; font-weight:800; color:#0f172a;">${rate}</div>
                        </div>
                        <h3 style="font-size:15px; font-weight:700; color:#1e293b; margin:0 0 12px 0; line-height:1.4;">${p.item_name}</h3>
                        <div style="margin-top:auto; padding-top:12px; border-top:1px dashed #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:11px; font-weight:600; color:#64748b; background:#f1f5f9; padding:4px 8px; border-radius:6px;">${p.item_code}</span>
                            <span style="font-size:11px; font-weight:600; color:#64748b;">${p.item_group_name || 'Category'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    window.filterProductCatalog = function (query) {
        if (!window._fullCatalog) return;
        query = query.toLowerCase();
        const filtered = window._fullCatalog.filter(p => 
            (p.item_name || "").toLowerCase().includes(query) || 
            (p.item_code || "").toLowerCase().includes(query) || 
            (p.brand_name || "").toLowerCase().includes(query)
        );
        renderProductsGrid(filtered);
    };

    window.showAddProductForm = function () {
        window._editingProductId = null;
        document.getElementById('product-form-overlay').classList.remove('hidden');
        document.getElementById('prod-modal-title').innerText = "Add New Product";
        
        // Reset fields
        document.getElementById('prod-code').value = "";
        document.getElementById('prod-name').value = "";
        document.getElementById('prod-brand').value = "";
        document.getElementById('prod-group').value = "";
        document.getElementById('prod-rate').value = 0;
        document.getElementById('prod-image').value = "";
        document.getElementById('prod-spec-url').value = "";
        document.getElementById('prod-options').value = "";
        
        // Reset buttons
        const imgBtn = document.getElementById('prod-image-btn');
        const specBtn = document.getElementById('prod-spec-btn');
        if (imgBtn) {
            imgBtn.innerHTML = '<i class="fas fa-image"></i> Upload';
            imgBtn.style.borderColor = '#e2e8f0';
            imgBtn.style.color = '#64748b';
            imgBtn.disabled = false;
        }
        if (specBtn) {
            specBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Upload Spec Sheet (PDF)';
            specBtn.style.borderColor = '#e2e8f0';
            specBtn.style.color = '#64748b';
            specBtn.disabled = false;
        }
    };

    window.editProduct = function (id) {
        if (!window._fullCatalog) return;
        const p = window._fullCatalog.find(item => item.id === id);
        if (!p) return;

        window._editingProductId = id;
        document.getElementById('product-form-overlay').classList.remove('hidden');
        document.getElementById('prod-modal-title').innerText = "Edit Product";

        document.getElementById('prod-code').value = p.item_code || "";
        document.getElementById('prod-name').value = p.item_name || "";
        document.getElementById('prod-brand').value = p.brand_name || "";
        document.getElementById('prod-group').value = p.item_group_name || "";
        document.getElementById('prod-rate').value = p.rate || 0;
        document.getElementById('prod-image').value = p.image_url || "";
        document.getElementById('prod-spec-url').value = p.spec_sheet_url || "";
        document.getElementById('prod-options').value = p.options_offered || "";

        // Update button states
        const imgBtn = document.getElementById('prod-image-btn');
        const specBtn = document.getElementById('prod-spec-btn');
        if (imgBtn && p.image_url) {
            imgBtn.innerHTML = '<i class="fas fa-check"></i> Image Set';
            imgBtn.style.borderColor = '#3b82f6';
            imgBtn.style.color = '#3b82f6';
        }
        if (specBtn && p.spec_sheet_url) {
            specBtn.innerHTML = '<i class="fas fa-check"></i> PDF Set';
            specBtn.style.borderColor = '#3b82f6';
            specBtn.style.color = '#3b82f6';
        }
    };

    window.closeProductForm = function () {
        document.getElementById('product-form-overlay').classList.add('hidden');
    };

    window.saveProductToSupabase = async function () {
        const isUpdate = !!window._editingProductId;
        const id = isUpdate ? window._editingProductId : "MANUAL-" + Date.now();
        
        const payload = {
            id: id,
            frappe_id: isUpdate ? undefined : id, 
            item_code: document.getElementById('prod-code').value,
            item_name: document.getElementById('prod-name').value,
            brand_name: document.getElementById('prod-brand').value,
            item_group_name: document.getElementById('prod-group').value,
            rate: parseFloat(document.getElementById('prod-rate').value) || 0,
            image_url: document.getElementById('prod-image').value,
            spec_sheet_url: document.getElementById('prod-spec-url').value,
            options_offered: document.getElementById('prod-options').value,
            uom: document.getElementById('prod-uom').value,
            updated_at: new Date().toISOString()
        };

        if (!isUpdate) {
            payload.created_at = new Date().toISOString();
        }

        if (!payload.item_code || !payload.item_name) {
            alert("Item Code and Name are required!");
            return;
        }

        try {
            // 1. Update local cache immediately for instant UI
            await window.cacheAPI.update('products', payload.id, payload);
            
            // 2. Queue for background sync to Supabase
            const operation = isUpdate ? 'update' : 'create';
            await window.syncAPI.queue('products', payload.id, operation, payload);
            
            window.closeProductForm();
            window.loadProductsFromSupabase(); // Refresh local list
            
            if (window.omnisLog) window.omnisLog(`Product ${isUpdate ? 'updated' : 'saved'} to local cache. Syncing...`, "success");
        } catch(e) {
            console.error("Save Error:", e);
            alert("Error saving: " + e.message);
        }
    };

    window.deleteProductFromSupabase = async function (id) {
        if (!confirm("Delete this product permanently?")) return;
        try {
            await window.syncAPI.queue('products', id, 'delete', null);
            if (window._fullCatalog) {
                window._fullCatalog = window._fullCatalog.filter(p => p.id !== id);
                renderProductsGrid(window._fullCatalog);
            }
            if (window.omnisLog) window.omnisLog("Product deletion queued.", "success");
        } catch(e) { console.error("Delete Error:", e); }
    };

    window.handleProductFileUpload = async function (input, type) {
        const file = input.files[0];
        if (!file) return;

        const btnId = type === 'image' ? 'prod-image-btn' : 'prod-spec-btn';
        const btn = document.getElementById(btnId);
        const originalHtml = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading...`;
        
        try {
            const reader = new FileReader();
            const base64Promise = new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            const base64Data = await base64Promise;
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const path = `products/${type}s/${fileName}`;
            
            const res = await window.storageAPI.upload('product-assets', path, base64Data, file.type);
            
            if (res && res.ok) {
                if (type === 'image') {
                    document.getElementById('prod-image').value = res.url;
                    btn.innerHTML = `<i class="fas fa-check"></i> Image Uploaded`;
                    btn.style.borderColor = '#10b981';
                    btn.style.color = '#10b981';
                } else {
                    document.getElementById('prod-spec-url').value = res.url;
                    btn.innerHTML = `<i class="fas fa-check"></i> PDF Uploaded`;
                    btn.style.borderColor = '#10b981';
                    btn.style.color = '#10b981';
                }
                if (window.omnisLog) window.omnisLog(`${type === 'image' ? 'Image' : 'Spec Sheet'} uploaded successfully.`, "success");
            } else {
                throw new Error(res ? res.error : "Upload failed");
            }
        } catch (e) {
            console.error("Upload Error:", e);
            alert("Upload failed: " + e.message);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    };

    window.generateAIProductImage = async function() {
        const name = document.getElementById('prod-name').value;
        const brand = document.getElementById('prod-brand').value;
        const group = document.getElementById('prod-group').value;

        if (!name) {
            alert("Please enter a product name first!");
            return;
        }

        const btn = document.getElementById('prod-ai-gen-btn');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-robot fa-spin"></i> Generating...`;

        try {
            // Construct the prompt for the AI agent
            const prompt = `Professional studio product photography of ${brand ? brand + ' ' : ''}${name} ${group ? '(' + group + ')' : ''}, centered, full view, on a pure white background, high resolution, industrial equipment style.`;
            
            if (window.omnisLog) window.omnisLog(`AI Agent: Generating image for "${name}"...`, "info");

            // We call the main process to trigger the AI generation tool
            // The main process will return a base64 or a temporary URL
            const res = await window.electron.invoke('generate-ai-image', {
                prompt: prompt,
                name: name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            });

            if (res && res.ok) {
                document.getElementById('prod-image').value = res.url;
                const imgBtn = document.getElementById('prod-image-btn');
                if (imgBtn) {
                    imgBtn.innerHTML = `<i class="fas fa-check"></i> AI Image Set`;
                    imgBtn.style.borderColor = '#3b82f6';
                    imgBtn.style.color = '#3b82f6';
                }
                if (window.omnisLog) window.omnisLog("AI Image generated and linked successfully.", "success");
            } else {
                throw new Error(res ? res.error : "AI Generation failed");
            }
        } catch (e) {
            console.error("AI Gen Error:", e);
            alert("AI Generation failed: " + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    };

    // --- PRODUCT CATALOG SUGGESTIONS ---
    function initProductCatalogSuggestions() {
        if (typeof window.setupSupabaseSuggestions === 'function') {
            const brandInput = document.getElementById('prod-brand');
            const brandSuggest = document.getElementById('prod-brand-suggest');
            const groupInput = document.getElementById('prod-group');
            const groupSuggest = document.getElementById('prod-group-suggest');
            
            if (brandInput && brandSuggest) {
                window.setupSupabaseSuggestions(brandInput, brandSuggest, "brands", "name");
            }
            if (groupInput && groupSuggest) {
                window.setupSupabaseSuggestions(groupInput, groupSuggest, "item_groups", "name");
            }
        }
    }
    // Initialize after a delay to ensure DOM is ready
    setTimeout(initProductCatalogSuggestions, 500);

    function init() {
        E.root = document.getElementById('mxg-root');
        if (!E.root) return;
        E.company = document.getElementById('mxg-company-filter');
        E.from = document.getElementById('mxg-from-date');
        E.to = document.getElementById('mxg-to-date');
        E.refreshBtn = document.getElementById('mxg-refresh-btn');

        E.pages = {
          1: document.querySelector('.mxg-page-1'),
          2: document.querySelector('.mxg-page-2'),
          3: document.querySelector('.mxg-page-3'),
          4: document.querySelector('.mxg-page-4'),
          5: document.querySelector('.mxg-page-5'),
          6: document.querySelector('.mxg-page-6'),
          7: document.querySelector('.mxg-page-7'),
          8: document.querySelector('.mxg-page-8')
        };

        E.tabs = document.querySelectorAll('.mxg-page-btn');

        if (E.refreshBtn) E.refreshBtn.addEventListener('click', () => window.loadGSMReport(true));

        E.tabs.forEach(btn => {
          btn.addEventListener('click', (e) => {
            const p = parseInt(e.target.dataset.page || "1");
            window.setPage(p);
            if (p === 4) window.renderStockTab();
          });
        });
        window.setPage(1);
      }

      window.setPage = setPage;

      // Register Init with safety guard
      let hasInit = false;
      window.safeInitGSMReport = function () {
        if (hasInit) return;
        hasInit = true;
        omnisLog("GSM Report: Initializing...");
        init();
      };
    })();
  