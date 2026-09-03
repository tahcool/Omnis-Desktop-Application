    // --- SUPABASE POWERED AUTOFILL ---
    window.setupSupabaseSuggestions = function (input, list, table, searchFields, onSelect = null) {
        if (!input || !list) return;

        let lastVal = "";
        const debounce = (func, wait) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func(...args), wait);
            };
        };

        const fetchSuggestions = async (val) => {
            val = (val || "").trim();
            if (val === lastVal && list.innerHTML !== "") return;
            if (val.length < 1) { list.classList.add('hidden'); return; }
            lastVal = val;

            const now = new Date().toLocaleTimeString();
            const sp = window.salestrack ? window.salestrack.supabase : null;
            
            list.innerHTML = `<div style="padding:8px; color:#64748b; font-size:11px; font-style:italic; text-align:center;"><i class="fa fa-bolt" style="color:#fbbf24;"></i> Turbo Search (${now})...</div>`;
            list.classList.remove('hidden');

            try {
                let results = [];
                
                if (sp) {
                    // 1. Direct Supabase Search (If client available)
                    const filterStr = searchFields.split(',').map(f => `${f.trim()}.ilike.%${val}%`).join(',');
                    const { data, error } = await sp.from(table).select('*').or(filterStr).limit(15);
                    if (!error) results = data;
                } else if (window.cacheAPI) {
                    // 2. Native Local Cache Search (Standard Mode)
                    const res = await window.cacheAPI.search(table, val, searchFields);
                    if (res && res.ok) results = res.data;
                }

                list.innerHTML = '';
                if (results && results.length > 0) {
                    list.innerHTML = results.map(item => {
                        const title = item.item_name || item.name || item.item_code;
                        const sub = item.item_code || item.brand_name || item.parent_group || "";
                        const details = item.brand_name ? `Brand: ${item.brand_name}` : (item.item_group_name ? `Group: ${item.item_group_name}` : "");
                        
                        return `
                            <div class="suggest-item" data-id="${item.id || item.name}" style="padding:10px 14px; border-bottom:1px solid #f1f5f9; cursor:pointer;">
                                <div style="font-weight:700; color:#1e293b; font-size:13.5px;">${title}</div>
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                                   <div style="font-size:11px; color:#64748b; font-weight:500;">${sub}</div>
                                   <div style="font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase;">${details}</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                    
                    list.querySelectorAll('.suggest-item').forEach(el => {
                        el.onclick = (e) => {
                            e.stopPropagation();
                            const id = el.getAttribute('data-id');
                            const item = results.find(i => (i.id === id || i.name === id));
                            
                            // Map to expected format
                            const mappedItem = {
                                value: item.frappe_id || item.item_code || item.name,
                                description: item.item_name || item.name || item.item_code,
                                brand: item.brand_name || "",
                                details: item.item_code || "",
                                rate: item.rate || 0
                            };

                            input.value = mappedItem.value;
                            if (onSelect) onSelect(mappedItem);
                            list.classList.add('hidden');
                        };
                    });
                } else {
                    list.innerHTML = `
                        <div style="padding:12px; color:#64748b; font-size:12px; text-align:center;">
                            No local matches found<br>
                            <button onclick="window.triggerCatalogSync(this)" style="margin-top:8px; padding:6px 16px; background:#3b82f6; color:white; border:none; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                                <i class="fas fa-sync-alt"></i> Sync Catalog Now
                            </button>
                        </div>
                    `;
                }
            } catch(e) { console.error("Search Suggest Error:", e); }
        };

        input.addEventListener('input', debounce((e) => fetchSuggestions(e.target.value), 200));
        input.addEventListener('focus', () => fetchSuggestions(input.value));
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const firstItem = list.querySelector('.suggest-item');
                if (firstItem && !list.classList.contains('hidden')) {
                    e.preventDefault();
                    firstItem.click();
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target !== input && !list.contains(e.target)) {
                list.classList.add('hidden');
            }
        }, { capture: true });
    };

    window.triggerCatalogSync = async function (btn) {
        if (!btn) return;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        
        try {
            const res = await window.syncAPI.catalogSync();
            if (res && res.ok) {
                alert('Catalog Sync Successful! You can search again now.');
            } else {
                alert('Sync failed: ' + (res ? res.error : 'Unknown error'));
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        } catch (e) {
            alert('Error: ' + e.message);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    };

    // --- GLOBAL UTILITY: setupSuggestions ---
    window.setupSuggestions = function (input, list, methodName, onSelect = null) {
      if (!input || !list) return;

      let lastVal = "";
      const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => func(...args), wait);
        };
      };

      const fetchSuggestions = async (val) => {
        val = (val || "").trim();
        if (val === lastVal && list.innerHTML !== "") return;

        lastVal = val;

        // Show Searching Indicator with Live Timestamp (to verify code is live)
        const now = new Date().toLocaleTimeString();
        list.innerHTML = `<div style="padding:8px; color:#64748b; font-size:11px; font-style:italic; text-align:center;"><i class="fa fa-spinner fa-spin"></i> Searching (${now})...</div>`;
        list.classList.remove('hidden');

        console.log(`[OmnisSearch] Starting search for "${val}" at ${now}...`);

        try {
          const baseUrl = (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.baseUrl) || "https://salestrack.powerstar.co.zw";
          const res = await window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard." + methodName, { txt: val });
          const data = res.message || res || [];

          // Clear Searching Indicator
          list.innerHTML = '';

          if (data && data.length > 0) {
            list.innerHTML = data.map((item, idx) => {
              // Highlight DEBUG messages in Red
              const isDebug = item.value === 'DEBUG_INFO' || item.value === 'ERROR' || (item.description && item.description.includes('Debug'));
              const color = isDebug ? '#ef4444' : '#334155';
              const bgColor = isDebug ? '#fef2f2' : 'transparent';

              return `
                            <div class="suggest-item" data-idx="${idx}" style="background:${bgColor}; border-bottom: ${isDebug ? '1px solid #fee2e2' : 'none'}">
                                <div style="font-weight:600; color:${color};">${item.description}</div>
                                ${item.details ? `<div style="font-size:10px; color:#64748b;">${item.details}</div>` : ''}
                            </div>
                        `;
            }).join('');
            list.classList.remove('hidden');

            list.querySelectorAll('.suggest-item').forEach(el => {
              el.onclick = (e) => {
                e.stopPropagation();
                const idx = parseInt(el.getAttribute('data-idx'), 10);
                const item = data[idx];
                if (!item || item.value === 'DEBUG_INFO' || item.value === 'ERROR') return;

                input.value = item.value;
                if (onSelect) {
                  try { onSelect(item); } catch(err) { console.error("onSelect error:", err); }
                }
                list.classList.add('hidden');
              };
            });
          } else {
            list.innerHTML = `<div style="padding:12px; color:#64748b; font-size:12px; text-align:center;">No matches found</div>`;
            list.classList.remove('hidden');
          }
        } catch (e) { console.error("Suggest error", e); }
      };

      input.addEventListener('input', debounce((e) => fetchSuggestions(e.target.value), 500));
      input.addEventListener('focus', () => fetchSuggestions(input.value));
      
      // Handle Enter key to select the first suggestion
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstItem = list.querySelector('.suggest-item');
            if (firstItem && !list.classList.contains('hidden')) {
                e.preventDefault();
                firstItem.click();
            }
        }
      });

      // Hide on click outside (capture:true to bypass modal propagation blocks)
      document.addEventListener('click', (e) => {
        if (e.target !== input && !list.contains(e.target)) {
          list.classList.add('hidden');
        }
      }, { capture: true });
    };


    let groupSalesInited = false;

    window.clearGsErrors = function() {
      document.querySelectorAll('.gs-input-error').forEach(el => el.classList.remove('gs-input-error'));
      const summary = document.getElementById('gs-error-summary');
      if (summary) summary.classList.add('hidden');
    }

    window.printGroupSalesList = function () {
      const rows = window._lastGroupSalesRows || [];
      const company = document.getElementById('group-sales-company')?.value || '';
      const fromDate = document.getElementById('gs-from-date')?.value || '';
      const toDate = document.getElementById('gs-to-date')?.value || '';
      const search = document.getElementById('group-sales-search')?.value || '';
      const printDate = new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' });

      const filterParts = [];
      if (company) filterParts.push(company === 'machinery' ? 'Machinery Exchange' : 'Sinopower');
      if (fromDate) filterParts.push('From: ' + fromDate);
      if (toDate) filterParts.push('To: ' + toDate);
      if (search) filterParts.push('Search: "' + search + '"');
      const filterLabel = filterParts.length ? filterParts.join(' · ') : 'All Companies';

      const rowsHtml = rows.map((r, i) => {
        const statusColor = r.customer_status === 'New' ? '#3b82f6' : '#64748b';
        const badge = r.condition_status
          ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;">${r.condition_status}</span>`
          : `<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;">NEW</span>`;
        return `
          <tr style="background:${i%2===0?'#fff':'#f8fafc'};">
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;">${r.customer || '—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">${r.oem || '—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">${r.model || '—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">${r.committed_lead_time || '—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${badge}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b;">${r.qty || 1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">${r.order_date || '—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:11px;">${r.salesperson || '—'}</td>
          </tr>`;
      }).join('');

      const win = window.open('', '_blank', 'width=1100,height=800');
      win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sales Entries — Omnis</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #0f172a; padding: 32px 40px; }
    .print-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #0f172a; }
    .print-header img { height: 44px; width: auto; }
    .print-header-right { text-align: right; }
    .print-title { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .print-meta { font-size: 12px; color: #64748b; margin-top: 4px; }
    .filter-bar { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; margin-bottom: 20px; font-size: 12px; color: #475569; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #0f172a; }
    thead th { padding: 11px 12px; font-size: 11px; font-weight: 700; color: #fff; text-align: left; text-transform: uppercase; letter-spacing: 0.05em; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td { font-size: 12px; }
    .print-footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 16px 24px; }
      .no-print { display: none !important; }
      @page { size: A4 landscape; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <img src="../../assets/images/omnis-logo.png" alt="Omnis" onerror="this.style.display='none'">
    <div class="print-header-right">
      <div class="print-title">Sales Entries</div>
      <div class="print-meta">Printed: ${printDate} &nbsp;·&nbsp; ${rows.length} record${rows.length!==1?'s':''} shown</div>
    </div>
  </div>
  <div class="filter-bar">Filter: ${filterLabel}</div>
  <table>
    <thead>
      <tr>
        <th>Customer</th>
        <th>Brand</th>
        <th>Model</th>
        <th>Lead Time</th>
        <th>Condition</th>
        <th style="text-align:center;">Qty</th>
        <th>Date</th>
        <th>Salesperson</th>
      </tr>
    </thead>
    <tbody>${rowsHtml || '<tr><td colspan="8" style="padding:40px;text-align:center;color:#94a3b8;">No records</td></tr>'}</tbody>
  </table>
  <div class="print-footer">
    <span>Omnis AI · SalesTrack</span>
    <span>Confidential — Internal Use Only</span>
  </div>
  \x3Cscript>
    window.onload = function() { window.print(); };
  \x3C/script>
  
  
  \x3Cscript src="user_management_logic.js">\x3C/script>
</body>
</html>`);
      win.document.close();
    };

    // showGroupSalesForm moved to block 1 (before editGroupSale) — see above

    /* ===== GIFT LIST ===== */

    window._giftListAllRows = [];

    /* ===== NEW SALE EMAIL ALERT ===== */
    async function sendNewSaleAlert(payload, saleName, matchedStock = null) {
      const companyKey = (payload.company || '').toLowerCase().includes('sino') ? 'spz' : 'mxg';
      const isSino = companyKey === 'spz';
      const brandName  = isSino ? 'Sinopower' : 'Machinery Exchange';
      const brandColour = isSino ? '#7b1515' : '#c92222';
      const logoUrl     = isSino
        ? 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/spz-logo.png'
        : 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/mxg-logo.png';

      // Read recipients from localStorage (same store as Order Tracking settings)
      let toEmail = '';
      let ccList  = [];
      try {
        const saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
        const compData = saved[companyKey] || {};
        toEmail = compData.contactEmail || '';
        if (Array.isArray(compData)) ccList = compData;
        else if (compData.cc && Array.isArray(compData.cc)) ccList = compData.cc;
      } catch(e) {}

      // Collect all addresses to notify
      const allAddresses = [...new Set([toEmail, ...ccList].filter(Boolean))];
      const primaryTo = 'antony@industrial-exchange.group';
      if (!allAddresses.some(a => a.toLowerCase() === primaryTo.toLowerCase())) {
        allAddresses.push(primaryTo);
      }
      const ccAddrs = allAddresses.filter(a => a.toLowerCase() !== primaryTo.toLowerCase());

      const orderDate  = payload.order_date
        ? new Date(payload.order_date).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })
        : new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
      const sentDate   = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
      const salesperson = payload.salesperson || 'Sales Team';

      const rows = [
        ['Customer',         payload.customer        || '—'],
        ['Brand / OEM',      payload.oem             || '—'],
        ['Model',            payload.model           || '—'],
        ['Quantity',         payload.qty             || '1'],
        ['Machine Condition',payload.machine_condition|| '—'],
        ['Order Date',       orderDate],
        ['Lead Time',        payload.committed_lead_time || '—'],
        ['Sector',           payload.sector          || '—'],
        ['Salesperson',      salesperson],
        ['Reference',        saleName                || '—']
      ];

      if (matchedStock) {
        rows.push(['Stock Status', '<span style="color:#10b981;font-weight:800;">In Stock (Deducted from Inventory)</span>']);
        if (matchedStock.production_completion) rows.push(['Production Date', matchedStock.production_completion]);
        if (matchedStock.shipping_date) rows.push(['Shipping Date', matchedStock.shipping_date]);
        if (matchedStock.eta_beira) rows.push(['ETA Beira', matchedStock.eta_beira]);
        if (matchedStock.eta_harare) rows.push(['ETA Harare', matchedStock.eta_harare]);
      } else {
        rows.push(['Stock Status', '<span style="color:#ef4444;font-weight:800;">Not in stock (New order from OEM required)</span>']);
      }

      const tableRows = rows.map(([label, val], i) => `
        <tr>
            <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;font-weight:bold;width:40%;background:#f8fafc;">${label}</td>
            <td style="padding:16px 20px;text-align:left;font-size:15px;color:#334155;vertical-align:top;border-bottom:1px solid #e2e8f0;">${val}</td>
        </tr>`).join('');
      const emailHtml = `
      <!DOCTYPE html><html><head><meta charset="utf-8"></head>
      <body style="margin:0;padding:24px;font-family:Arial,'Helvetica Neue',sans-serif;background:#f0f4f8;">
      <div style="max-width:920px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
          <table style="width:100%;border-collapse:collapse;background:${brandColour};" cellpadding="0" cellspacing="0"><tr>
              <td style="padding:24px 32px;vertical-align:middle;width:45%;">
              <img src="${logoUrl}" alt="${brandName}" style="display:block;height:125px;width:auto;max-width:300px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
              </td>
              <td style="padding:24px 32px;vertical-align:middle;text-align:right;width:55%;">
              <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${brandName}</div>
              <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:6px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">New Sale Logged</div>
              <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;">Date: ${sentDate}</div>
              </td>
          </tr></table>

          <div style="padding:32px 32px 16px;">
              <p style="margin:0;font-size:16px;color:#0f172a;line-height:1.7;">
                  A new sale for <strong>${payload.customer || 'a customer'}</strong> has been recorded in the system. 
                  This order has been automatically synced to the Order Tracking module for logistics monitoring.
              </p>
          </div>
          
          <div style="padding:16px 32px 36px;overflow-x:auto;">
              <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:15px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
                  <thead>
                      <tr style="background:${brandColour};">
                          <th colspan="2" style="padding:16px 20px;text-align:left;color:white;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid rgba(0,0,0,0.1);">Order Details</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${tableRows}
                  </tbody>
              </table>
          </div>
          
          <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 28px;font-size:11px;color:#94a3b8;text-align:center;">
              This is an automated alert from <strong>Omnis SalesTrack</strong>.<br>
              Please do not reply to this email. &copy; ${brandName} &mdash; Omnis Order Management System
          </div>
      </div>
        
</body>
      </html>
      `;

      const subject = `[NEW ORDER] ${payload.customer || 'Customer'} | ${payload.oem || ''} ${payload.model || ''} | ${brandName}`;
      const createdBy = localStorage.getItem('ft_user_email') || '';

      try {
        if (window.electron) {
          const res = await window.electron.invoke('email:send', {
            to: primaryTo,
            cc: ccAddrs.length > 0 ? ccAddrs.join(',') : undefined,
            subject,
            html: emailHtml,
            relatedDoc: saleName,
            relatedType: 'group_sale',
            createdBy
          });
          if (res?.ok) {
            console.log('[Sale Alert] Sent to:', primaryTo, 'CC:', ccAddrs.join(','));
          } else {
            console.warn('[Sale Alert] email:send error', res?.error);
          }
        } else {
          console.warn('[Sale Alert] window.electron not available');
        }
      } catch (e) {
        console.warn('[Sale Alert] Error invoking email:send', e);
      }
    }
    /* ===== END NEW SALE EMAIL ALERT ===== */

    window._giftActivePeriod = 'all';

    window.setGiftPeriod = function (period) {
      window._giftActivePeriod = period;
      // Update chip styles
      document.querySelectorAll('.gift-period-chip').forEach(btn => {
        btn.style.background = '#fff';
        btn.style.color = '#475569';
        btn.style.borderColor = '#e2e8f0';
      });
      const active = document.getElementById('gift-period-' + period);
      if (active) { active.style.background = '#0f172a'; active.style.color = '#fff'; active.style.borderColor = '#0f172a'; }
      // Toggle custom range pickers
      const rangeEl = document.getElementById('gift-custom-range');
      if (rangeEl) rangeEl.style.display = (period === 'custom') ? 'flex' : 'none';
      renderGiftTable();
    };

    function getGiftDateRange () {
      const p = window._giftActivePeriod || 'all';
      const now = new Date();
      if (p === 'all') return { from: null, to: null };
      if (p === 'month') {
        return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10),
                 to:   new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10) };
      }
      if (p === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        return { from: new Date(now.getFullYear(), q*3, 1).toISOString().slice(0,10),
                 to:   new Date(now.getFullYear(), q*3+3, 0).toISOString().slice(0,10) };
      }
      if (p === 'year') {
        return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
      }
      if (p === '12m') {
        const from = new Date(now); from.setFullYear(from.getFullYear()-1);
        return { from: from.toISOString().slice(0,10), to: now.toISOString().slice(0,10) };
      }
      if (p === 'custom') {
        return { from: document.getElementById('gift-from-date')?.value || null,
                 to:   document.getElementById('gift-to-date')?.value   || null };
      }
      return { from: null, to: null };
    }

    function aggregateGiftRows (rows, companyFilter) {
      const { from, to } = getGiftDateRange();
      const map = {};
      rows.forEach(r => {
        if (companyFilter) {
          const co = (r.company || '').toLowerCase();
          if (companyFilter === 'machinery' && !co.includes('machinery')) return;
          if (companyFilter === 'sinopower' && !co.includes('sino')) return;
        }
        if (from && r.order_date && r.order_date < from) return;
        if (to   && r.order_date && r.order_date > to)   return;
        const key = (r.customer || 'Unknown').trim();
        if (!map[key]) map[key] = { customer: key, totalQty: 0, brands: new Set(), models: [], lastDate: '', salesperson: '' };
        map[key].totalQty += parseInt(r.qty || 1);
        if (r.oem) map[key].brands.add(r.oem);
        if (r.model && !map[key].models.includes(r.model)) map[key].models.push(r.model);
        if (r.order_date && (!map[key].lastDate || r.order_date > map[key].lastDate)) {
          map[key].lastDate = r.order_date;
          map[key].salesperson = r.salesperson || '';
        }
      });
      return map;
    }

    window.openGiftListModal = async function () {
      const overlay = document.getElementById('gift-list-overlay');
      if (!overlay) return;
      // Reparent to body so it's never inside a display:none ancestor
      if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
      overlay.style.display = 'flex';

      const body = document.getElementById('gift-list-body');
      if (body) body.innerHTML = '<div style="padding:60px; text-align:center; color:#64748b;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i><div style="margin-top:14px; font-weight:600;">Loading all sales records...</div></div>';

      // Sync company filter with main list
      const mainCompany = document.getElementById('group-sales-company')?.value || '';
      const giftCompanyEl = document.getElementById('gift-company-filter');
      if (giftCompanyEl) giftCompanyEl.value = mainCompany;

      try {
        const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, '');
        const savedCircuit = window.frappeCircuitOpenedUntil || 0;
        window.frappeCircuitOpenedUntil = 0;
        let res;
        try {
          res = await window.callFrappeSequenced(base, 'powerstar_salestrack.omnis_dashboard.get_group_sales_list', {
            start: 0,
            page_length: 9999,
            search: '',
            company: '',
            from_date: '',
            to_date: ''
          });
        } finally {
          window.frappeCircuitOpenedUntil = savedCircuit;
        }
        const response = res.message || res;
        window._giftListAllRows = response.data || [];
      } catch (e) {
        if (body) body.innerHTML = `<div style="padding:40px; text-align:center; color:#ef4444; font-weight:700;"><i class="fas fa-exclamation-circle"></i> Failed to load: ${e.message}</div>`;
        return;
      }

      renderGiftTable();
    };

    window.closeGiftListModal = function () {
      const overlay = document.getElementById('gift-list-overlay');
      if (overlay) overlay.style.display = 'none';
    };

    window.renderGiftTable = function () {
      const body = document.getElementById('gift-list-body');
      const countEl = document.getElementById('gift-list-count');
      if (!body) return;

      const minQty = parseInt(document.getElementById('gift-min-qty')?.value || '3');
      const companyFilter = (document.getElementById('gift-company-filter')?.value || '').toLowerCase();
      const map = aggregateGiftRows(window._giftListAllRows || [], companyFilter);

      // Filter by threshold, hide testing account, and sort descending
      const customers = Object.values(map)
        .filter(c => c.totalQty >= minQty && c.customer !== 'Takunda Tarumbwa')
        .sort((a, b) => b.totalQty - a.totalQty);

      if (countEl) countEl.textContent = customers.length + ' customer' + (customers.length !== 1 ? 's' : '') + ' qualify';

      if (customers.length === 0) {
        body.innerHTML = '<div style="padding:60px; text-align:center; color:#94a3b8; font-size:13px; font-weight:600;">No customers meet the threshold. Try lowering the minimum units.</div>';
        return;
      }

      const tierColor = (qty) => {
        if (qty >= 10) return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', label: 'VIP' };
        if (qty >= 5)  return { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', label: 'LOYAL' };
        return           { bg: '#f0fdf4', border: '#10b981', text: '#065f46', label: 'GOOD' };
      };

      body.innerHTML = customers.map((c, i) => {
        const t = tierColor(c.totalQty);
        const brandsStr = [...c.brands].join(', ') || '—';
        const modelsStr = c.models.slice(0, 3).join(', ') + (c.models.length > 3 ? ` +${c.models.length-3}` : '') || '—';
        const dateStr = c.lastDate ? new Date(c.lastDate).toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' }) : '—';
        return `
          <div style="display:grid; grid-template-columns:48px 280px 80px 1fr 160px 140px; gap:0; padding:14px 28px; border-bottom:1px solid #f1f5f9; align-items:center; background:${i%2===0?'#fff':'#fafafa'}; transition: background 0.15s;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='${i%2===0?'#fff':'#fafafa'}';">
            <div style="font-size:13px; font-weight:800; color:#94a3b8;">#${i+1}</div>
            <div>
              <div style="font-weight:700; color:#0f172a; font-size:14px;">${c.customer}</div>
              <span style="display:inline-block; margin-top:3px; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:800; background:${t.bg}; color:${t.text}; border:1px solid ${t.border};">${t.label}</span>
            </div>
            <div style="text-align:center;">
              <div style="font-size:22px; font-weight:900; color:#0f172a;">${c.totalQty}</div>
              <div style="font-size:10px; font-weight:600; color:#94a3b8;">units</div>
            </div>
            <div>
              <div style="font-size:12px; font-weight:700; color:#475569;">${brandsStr}</div>
              <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${modelsStr}</div>
            </div>
            <div style="font-size:12px; color:#64748b; font-weight:600;">${dateStr}</div>
            <div style="font-size:12px; color:#64748b;">${c.salesperson || '—'}</div>
          </div>`;
      }).join('');
    };

    window.printGiftList = function () {
      const minQty = parseInt(document.getElementById('gift-min-qty')?.value || '3');
      const companyFilter = document.getElementById('gift-company-filter')?.value || '';
      const printDate = new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' });
      const map = aggregateGiftRows(window._giftListAllRows || [], companyFilter.toLowerCase());
      const { from, to } = getGiftDateRange();
      const periodLabels = { all:'All Time', month:'This Month', quarter:'This Quarter', year:'This Year', '12m':'Last 12 Months', custom:'Custom Range' };
      const periodLabel = periodLabels[window._giftActivePeriod || 'all'] + (window._giftActivePeriod==='custom'&&(from||to) ? ` (${from||'?'} – ${to||'?'})` : '');
      const customers = Object.values(map).filter(c => c.totalQty >= minQty && c.customer !== 'Takunda Tarumbwa').sort((a,b) => b.totalQty - a.totalQty);
      const companyLabel = companyFilter === 'machinery' ? 'Machinery Exchange' : companyFilter === 'sinopower' ? 'Sinopower' : 'All Companies';

      const rows = customers.map((c, i) => {
        const tier = c.totalQty >= 10 ? 'VIP' : c.totalQty >= 5 ? 'LOYAL' : 'GOOD';
        const tierStyle = c.totalQty >= 10 ? 'background:#fef3c7;color:#92400e;' : c.totalQty >= 5 ? 'background:#ede9fe;color:#5b21b6;' : 'background:#f0fdf4;color:#065f46;';
        const brandsStr = [...c.brands].join(', ') || '—';
        const modelsStr = c.models.slice(0,4).join(', ') + (c.models.length>4?` +${c.models.length-4}`:'') || '—';
        const dateStr = c.lastDate ? new Date(c.lastDate).toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' }) : '—';
        return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
          <td style="padding:10px 12px;text-align:center;font-weight:700;color:#94a3b8;">${i+1}</td>
          <td style="padding:10px 12px;font-weight:700;color:#0f172a;"><div>${c.customer}</div><span style="padding:2px 8px;border-radius:20px;font-size:9px;font-weight:800;${tierStyle}">${tier}</span></td>
          <td style="padding:10px 12px;text-align:center;font-size:20px;font-weight:900;color:#0f172a;">${c.totalQty}</td>
          <td style="padding:10px 12px;font-size:11px;color:#475569;"><b>${brandsStr}</b><br><span style="color:#94a3b8;">${modelsStr}</span></td>
          <td style="padding:10px 12px;font-size:12px;color:#64748b;">${dateStr}</td>
          <td style="padding:10px 12px;font-size:12px;color:#64748b;">${c.salesperson || '—'}</td>
        </tr>`;
      }).join('');

      const win = window.open('', '_blank', 'width=1100,height=800');
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Gift List — Omnis</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'Inter',Arial,sans-serif; background:#fff; color:#0f172a; padding:32px 40px; }
.header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; padding-bottom:20px; border-bottom:3px solid #064e3b; }
.header img { height:44px; }
.title { font-size:22px; font-weight:800; color:#064e3b; }
.meta { font-size:12px; color:#64748b; margin-top:3px; }
.info-bar { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 16px; margin-bottom:20px; font-size:12px; color:#065f46; font-weight:700; display:flex; gap:24px; }
table { width:100%; border-collapse:collapse; }
thead tr { background:#064e3b; }
thead th { padding:11px 12px; font-size:10px; font-weight:800; color:#fff; text-align:left; text-transform:uppercase; letter-spacing:0.05em; }
.footer { margin-top:24px; padding-top:14px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; display:flex; justify-content:space-between; }
@media print { body{padding:16px 24px;} @page{size:A4 landscape;margin:15mm;} }
</style></head><body>
<div class="header">
  <img src="../../assets/images/omnis-logo.png" alt="Omnis" onerror="this.style.display='none'">
  <div style="text-align:right"><div class="title">Customer Gift List</div><div class="meta">Printed: ${printDate} &nbsp;&middot;&nbsp; Min. Units: ${minQty} &nbsp;&middot;&nbsp; ${customers.length} customers</div></div>
</div>
<div class="info-bar">
  <span><i>Company:</i> ${companyLabel}</span>
  <span><i>Threshold:</i> ${minQty}+ units &nbsp;&middot;&nbsp; Period: ${periodLabel}</span>
  <span><i>Tiers:</i> VIP = 10+, LOYAL = 5–9, GOOD = ${minQty}–4</span>
</div>
<table>
<thead><tr><th>#</th><th>Customer</th><th style="text-align:center">Units</th><th>Brands &amp; Models</th><th>Last Purchase</th><th>Salesperson</th></tr></thead>
<tbody>${rows || '<tr><td colspan="6" style="padding:40px;text-align:center;color:#94a3b8;">No customers meet threshold</td></tr>'}</tbody>
</table>
<div class="footer"><span>Omnis AI &middot; SalesTrack &mdash; Customer Appreciation</span><span>Confidential &mdash; Internal Use Only</span></div>
\x3Cscript>window.onload=function(){window.print();};\x3C/script>
  
  
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

    window._latestMatchedStock = null;
    window.checkStockAvailability = async function() {
      const model = document.getElementById('gs-model').value.trim();
      const badge = document.getElementById('gs-stock-badge');
      if (!model) {
        if(badge) badge.innerHTML = "";
        window._latestMatchedStock = null;
        return;
      }
      
      try {
        if(badge) {
          badge.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Checking stock...`;
          badge.style.color = "#64748b";
        }
        
        const res = await window.electron.invoke('supabase:query', {
          table: 'stock_inventory',
          method: 'select',
          params: {
            ilike: [{ col: 'model', pat: `%${model}%` }]
          }
        });
        if (res.ok && res.data && res.data.length > 0) {
          // Filter to those with quantity > 0 and exact match (case-insensitive + trimmed)
          const availableStock = res.data.filter(s => 
            parseInt(s.actual_qty) > 0 && 
            s.model && 
            s.model.trim().toLowerCase() === model.toLowerCase()
          );
          if (availableStock.length > 0) {
             // Sort by earliest target date / production date
             availableStock.sort((a,b) => {
                const dateA = a.shipping_date || a.production_completion || a.eta_beira || a.eta_harare || '9999-12-31';
                const dateB = b.shipping_date || b.production_completion || b.eta_beira || b.eta_harare || '9999-12-31';
                return dateA.localeCompare(dateB);
             });
             const stock = availableStock[0];
             window._latestMatchedStock = stock;
             const qty = stock.actual_qty;
             let etaStr = "";
             if (stock.eta_harare) etaStr = `(ETA: Harare ${stock.eta_harare})`;
             else if (stock.eta_beira) etaStr = `(ETA: Beira ${stock.eta_beira})`;
             else if (stock.shipping_date) etaStr = `(Ship: ${stock.shipping_date})`;
             else if (stock.production_completion) etaStr = `(Prod: ${stock.production_completion})`;
             else etaStr = `(In Stock)`;
             
             if(badge) {
                badge.innerHTML = `<i class="fas fa-check-circle"></i> ${qty} in stock ${etaStr}`;
                badge.style.color = "#10b981";
             }
          } else {
             window._latestMatchedStock = null;
             if(badge) {
                badge.innerHTML = `<i class="fas fa-times-circle"></i> Out of stock (New OEM Order Required)`;
                badge.style.color = "#ef4444";
             }
          }
        } else {
          window._latestMatchedStock = null;
          if(badge) {
             badge.innerHTML = `<i class="fas fa-times-circle"></i> Out of stock (New OEM Order Required)`;
             badge.style.color = "#ef4444";
          }
        }
      } catch (err) {
        console.error("Stock check error:", err);
        if(badge) badge.innerHTML = "";
        window._latestMatchedStock = null;
      }
    };

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
      if (window.clearGsErrors) window.clearGsErrors();
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
          // --- PUSH TO ORDER TRACKING (Supabase) ---
          try {
            if (window._forceTrackingPush) {
              const saleFrappeId = response.name; // e.g. "SM Projects-031125-1492"

              // 1. Check if this group sale is already in fmb_reports
              const { data: existing } = await window.electron.invoke('supabase:query', {
                table: 'fmb_reports',
                method: 'select',
                params: { filters: { frappe_id: saleFrappeId } }
              });

              let fmbId = existing && existing.length > 0 ? existing[0].id : null;

              if (!fmbId) {
                // 2. Create the fmb_reports header
                const { data: newFmb, error: fmbErr } = await window.electron.invoke('supabase:query', {
                  table: 'fmb_reports',
                  method: 'insert',
                  data: {
                    frappe_id:     saleFrappeId,
                    customer_id:   payload.customer,
                    customer_name: payload.customer,
                    order_date:    payload.order_date,
                    company:       payload.company || '',
                    status:        'In Progress'
                  }
                });
                if (fmbErr) throw new Error('fmb_reports insert failed: ' + fmbErr.message);
                fmbId = newFmb && newFmb[0] ? newFmb[0].id : null;
              }

              if (!fmbId) throw new Error('Could not get fmb_reports ID after insert.');

              // 3. Calculate target_date = order_date + 16 weeks (112 days)
              const saleDate = new Date(payload.order_date + 'T00:00:00');
              saleDate.setDate(saleDate.getDate() + 112);
              const targetDate16w = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD

              // 4. Add the machine line item
              await window.electron.invoke('supabase:query', {
                table: 'order_machines',
                method: 'insert',
                data: {
                  order_id:    fmbId,
                  item_code:   payload.model,
                  quantity:    parseInt(payload.qty) || 1,
                  target_date: targetDate16w,
                  notes:       `${payload.oem ? payload.oem + ' ' : ''}${payload.model} | Salesperson: ${payload.salesperson}`
                }
              });

              // 5. Bump updated_at on header
              await window.electron.invoke('supabase:query', {
                table: 'fmb_reports',
                method: 'update',
                data: { updated_at: new Date().toISOString() },
                params: { match: { id: fmbId } }
              });

              alert('✅ Sale pushed to Order Tracking!');
              window._forceTrackingPush = false;
            }
          } catch(syncErr) {
            console.error('[Push to Tracking Error]', syncErr);
            alert('⚠️ Could not push to Order Tracking: ' + syncErr.message);
            window._forceTrackingPush = false;
          }

          // --- AUTO DEDUCT FROM STOCK ---
          if (!window._editingGroupSaleName && window._latestMatchedStock) {
              try {
                  const stock = window._latestMatchedStock;
                  const qtySold = parseInt(payload.qty || 1);
                  const currentStockQty = parseInt(stock.actual_qty || 0);
                  const newQty = currentStockQty - qtySold;
                  
                  if (newQty <= 0) {
                      await window.electron.invoke('supabase:query', {
                          table: 'stock_inventory',
                          method: 'delete',
                          params: { match: { id: stock.id } }
                      });
                      console.log("[Stock] Deducted to 0, removed stock entry:", stock.id);
                  } else {
                      await window.electron.invoke('supabase:query', {
                          table: 'stock_inventory',
                          method: 'update',
                          data: { actual_qty: newQty },
                          params: { match: { id: stock.id } }
                      });
                      console.log("[Stock] Deducted qty:", qtySold, "from stock:", stock.id);
                  }
              } catch(deductErr) {
                  console.error("[Stock Deduction Error]", deductErr);
              }
          }

          // --- NEW SALE EMAIL ALERT ---
          if (!window._editingGroupSaleName) {
            try { sendNewSaleAlert(payload, response.name, window._latestMatchedStock); } catch(emailErr) { console.warn('[Sale Alert] Email failed:', emailErr); }
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
    // window._editingStockId = null; // Removed to prevent duplicate creation on subsequent saves
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
        console.log("---- OMNIS: NEW CODE EXECUTING ----");
        console.log("[Stock] showStockPipelineForm invoked with data:", inputData);
        if (inputData instanceof Event) inputData = null;
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
        try { document.getElementById('sp-doc-id').value = id || ""; } catch(e) {}
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
          window.setupSuggestions(document.getElementById('sp-customer-search'), document.getElementById('sp-cust-suggest'), "search_customer_for_omnis", (selected) => {
            window.addSPPotentialCustomer(selected.description || selected.value, selected.phone || "");
          });

          spFormInited = true;
        }
        console.log("Forcing overlay to display flex (BRUTE FORCE V2)");
        document.querySelectorAll('#sp-form-overlay').forEach(o => {
          try { document.body.appendChild(o); } catch(e) {}
          o.style.setProperty('display', 'flex', 'important');
          o.style.setProperty('position', 'fixed', 'important');
          o.style.setProperty('top', '0', 'important');
          o.style.setProperty('left', '0', 'important');
          o.style.setProperty('width', '100vw', 'important');
          o.style.setProperty('height', '100vh', 'important');
          o.style.setProperty('z-index', '2147483647', 'important');
          o.style.setProperty('visibility', 'visible', 'important');
          o.style.setProperty('opacity', '1', 'important');
          o.style.setProperty('background', 'rgba(15, 23, 42, 0.8)', 'important');
          o.classList.remove('hidden');
        });
        document.querySelectorAll('.gs-form-modal').forEach(m => {
          m.style.setProperty('display', 'flex', 'important');
          m.style.setProperty('visibility', 'visible', 'important');
          m.style.setProperty('opacity', '1', 'important');
          m.style.setProperty('z-index', '2147483647', 'important');
        });
      } // closes if (overlay)
      } catch(err) { console.error("ERROR in showStockPipelineForm:", err); alert("Error opening form: " + err.message); }
    };

    window.closeStockPipelineForm = function () {
      const overlay = document.getElementById('sp-form-overlay');
      if (overlay) {
          overlay.style.setProperty('display', 'none', 'important');
      }
    };

    async function saveStockPipelineRecord() {
      const btn = document.getElementById('btn-save-stock-pipeline');
      const originalText = btn.textContent;

      const rawId = window._editingStockId || "";
      const isZombie = rawId.startsWith("omnis-") || (rawId.length === 36 && rawId.includes('-'));
      
      const payload = {
        name: isZombie ? "" : rawId,
        report_id: isZombie ? "" : rawId, // Redundant for extract_params robustness
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
          // Keep form open for further edits
          window._editingStockId = response.name;
          try { document.getElementById('sp-doc-id').value = response.name; } catch(e) {}
          const overlay = document.getElementById('sp-form-overlay');
          if (overlay) {
              const titleEl = overlay.querySelector('h2');
              if (titleEl) titleEl.innerText = `Edit Stock Pipeline Entry (${response.name})`;
          }
          // --- Supabase Real-time Sync ---
          try {
             let sData = null;
             let sErr = null;
             const stockId = response.name;
             
             // Intelligent Company Mapping
             let companyTag = "Sinopower"; // Default
             const oem = (payload.oem || "").toLowerCase();
             if (oem.includes("machinery") || oem.includes("bobcat") || oem.includes("hitachi") || oem.includes("shantui") || oem.includes("foton") || oem.includes("faw") || oem.includes("xcmg")) {
                 companyTag = "Machinery Exchange";
             }
             
             const upsertPayload = {
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
             };

             if (window.electron && window.electron.invoke) {
                 console.log("[Stock] Supabase Sync via Electron IPC...");
                 if (isZombie && stockId !== rawId) {
                     let matchParams = { frappe_id: rawId };
                     if (rawId.length === 36 && rawId.includes('-')) {
                         matchParams = { id: rawId };
                     }
                     const fetchRes = await window.electron.invoke('supabase:query', {
                         table: 'stock_inventory', method: 'select', params: { columns: 'id', match: matchParams }
                     });
                     if (fetchRes && fetchRes.ok && fetchRes.data && fetchRes.data.length > 0) {
                         for (let z of fetchRes.data) {
                             await window.electron.invoke('supabase:query', { table: 'stock_potential_customers', method: 'delete', params: { match: { stock_id: z.id } } });
                         }
                     }
                     await window.electron.invoke('supabase:query', { table: 'stock_inventory', method: 'delete', params: { match: matchParams } });
                 }

                 const upRes = await window.electron.invoke('supabase:query', {
                     table: 'stock_inventory', method: 'upsert',
                     data: upsertPayload,
                     params: { options: { onConflict: 'frappe_id' } }
                 });
                 if (upRes && upRes.ok) sData = upRes.data; else sErr = upRes ? upRes.error : "Unknown IPC error";
                 
                 if (!sErr && sData && sData.length > 0) {
                     const stockUuid = sData[0].id;
                     let pcs = [];
                     try { pcs = JSON.parse(payload.potential_customers); } catch(e) {}
                     if (Array.isArray(pcs)) {
                         await window.electron.invoke('supabase:query', { table: 'stock_potential_customers', method: 'delete', params: { match: { stock_id: stockUuid } } });
                         if (pcs.length > 0) {
                             const custPayloads = pcs.map(p => ({ stock_id: stockUuid, customer_name: p.customer_name || p.customer || p.name || "" })).filter(p => p.customer_name);
                             if (custPayloads.length > 0) {
                                 await window.electron.invoke('supabase:query', { table: 'stock_potential_customers', method: 'insert', data: custPayloads });
                             }
                         }
                     }
                 }
             } else if (window.salestrack && window.salestrack.supabase) {
                 console.log("[Stock] Supabase Sync via direct client...");
                 const sp = window.salestrack.supabase;
                 
                 if (isZombie && stockId !== rawId) {
                     let matchCol = 'frappe_id';
                     if (rawId.length === 36 && rawId.includes('-')) {
                         matchCol = 'id';
                     }
                     const { data: zData } = await sp.from('stock_inventory').select('id').eq(matchCol, rawId);
                     if (zData && zData.length > 0) {
                         for (let z of zData) {
                             await sp.from('stock_potential_customers').delete().eq('stock_id', z.id);
                         }
                     }
                     await sp.from('stock_inventory').delete().eq(matchCol, rawId);
                 }

                 const { data, error } = await sp.from('stock_inventory').upsert(upsertPayload, { onConflict: 'frappe_id' }).select();
                 sData = data; sErr = error;

                 if (!sErr && sData && sData.length > 0) {
                     const stockUuid = sData[0].id;
                     let pcs = [];
                     try { pcs = JSON.parse(payload.potential_customers); } catch(e) {}
                     if (Array.isArray(pcs)) {
                         await sp.from('stock_potential_customers').delete().eq('stock_id', stockUuid);
                         if (pcs.length > 0) {
                             const custPayloads = pcs.map(p => ({ stock_id: stockUuid, customer_name: p.customer_name || p.customer || p.name || "" })).filter(p => p.customer_name);
                             if (custPayloads.length > 0) {
                                 await sp.from('stock_potential_customers').insert(custPayloads);
                             }
                         }
                     }
                 }
             }

             if (!sErr && sData) {
                 console.log("[Supabase] Stock Sync Successful:", stockId);
             } else if (sErr) {
                 console.error("[Supabase] Stock Sync Error:", sErr);
             }
          } catch(syncErr) {
             console.error("[Supabase] Sync Logic Error:", syncErr);
          }

          // Bust the local cache so the next render fetches fresh data
          localStorage.removeItem('mxg_stock_pipeline_cache');
          if (CURRENT_SYSTEM) {
            localStorage.removeItem("mxg_stock_data_" + CURRENT_SYSTEM.id);
          }
          if (window._stockViewMode === 'calendar') {
            window.renderArrivalCalendar();
          } else {
            window.renderStockTab();
          }
          omnisLog("Stock record " + (window._editingStockId ? "updated" : "saved") + " successfully: " + response.name);
          // window._editingStockId = null; // Removed to prevent duplicate creation on subsequent saves
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
          if (window._omnisConfirmKeyHandler) {
            document.removeEventListener('keydown', window._omnisConfirmKeyHandler);
            delete window._omnisConfirmKeyHandler;
          }
          resolve(val);
        };

        primaryBtn.onclick = () => window._omnisConfirmResolve(true);
        // Force the highest possible z-index dynamically just in case
        overlay.style.setProperty('z-index', '2147483647', 'important');
        overlay.classList.add('active');

        // Escape key to cancel
        window._omnisConfirmKeyHandler = (e) => {
          if (e.key === 'Escape' && window._omnisConfirmResolve) {
            window._omnisConfirmResolve(false);
          }
        };
        document.addEventListener('keydown', window._omnisConfirmKeyHandler);
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

        const isAlreadyDeleted = response && response.error && response.error.includes("not found");
        if ((response && response.ok) || isAlreadyDeleted) {
          // --- Supabase Delete Sync ---
          try {
             if (window.electron && window.electron.invoke) {
                 let matchParams = { frappe_id: id };
                 if (id.length === 36 && id.includes('-')) {
                     matchParams = { id: id };
                 }
                 const fetchRes = await window.electron.invoke('supabase:query', {
                     table: 'stock_inventory',
                     method: 'select',
                     params: { columns: 'id', match: matchParams }
                 });
                 if (fetchRes && fetchRes.ok && fetchRes.data && fetchRes.data.length > 0) {
                     const stockUuid = fetchRes.data[0].id;
                     await window.electron.invoke('supabase:query', {
                         table: 'stock_potential_customers',
                         method: 'delete',
                         params: { match: { stock_id: stockUuid } }
                     });
                 }
                 await window.electron.invoke('supabase:query', {
                     table: 'stock_inventory',
                     method: 'delete',
                     params: { match: matchParams }
                 });
                 console.log("[Supabase-Electron] Stock Delete Successful:", id);
             } else if (window.salestrack && window.salestrack.supabase) {
                const sp = window.salestrack.supabase;
                let matchCol = 'frappe_id';
                if (id.length === 36 && id.includes('-')) {
                    matchCol = 'id';
                }
                const { data: fetchDel } = await sp.from('stock_inventory').select('id').eq(matchCol, id);
                if (fetchDel && fetchDel.length > 0) {
                    await sp.from('stock_potential_customers').delete().eq('stock_id', fetchDel[0].id);
                }
                await sp.from('stock_inventory').delete().eq(matchCol, id);
                console.log("[Supabase] Stock Delete Successful:", id);
             }
          } catch(e) { console.error("[Supabase] Delete Sync Error:", e); }

          window.showToast?.('Record Deleted Successfully', 'success');
          window.closeStockPipelineForm();
          // Bust the local cache so the next render fetches fresh data
          localStorage.removeItem('mxg_stock_pipeline_cache');
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