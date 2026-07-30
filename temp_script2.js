    window.onload = function() { window.print(); };
  <\/script>
  
</body>
</html>`);
      win.document.close();
    };

    window.showGroupSalesForm = function () {
      const overlay = document.getElementById('gs-form-overlay');
      if (overlay) {
        // Escape any hidden ancestor: position:fixed is still invisible when a
        // parent has display:none. Move to document.body exactly once.
        if (overlay.parentElement !== document.body) {
          document.body.appendChild(overlay);
        }
        clearGsErrors();

        // Reset edit tracking and title
        window._editingGroupSaleName = null;
        const titleEl = document.querySelector('#gs-form-overlay h2');
        if (titleEl) titleEl.textContent = 'New Sale';
        
        // Hide Push to Tracking button for new sales
        const pushBtn = document.getElementById('btn-push-tracking');
        if (pushBtn) pushBtn.style.display = 'none';

        // Reset form
        document.getElementById('gs-customer').value = "";
        document.getElementById('gs-order_date').valueAsDate = new Date();
        document.getElementById('gs-lead-time').value = "";
        document.getElementById('gs-oem').value = "";
        document.getElementById('gs-condition').value = "New";
        document.getElementById('gs-model').value = "";
        document.getElementById('gs-qty').value = "1";
        document.getElementById('gs-cust-status').value = "Existing";
        document.getElementById('gs-sector').value = "";
        document.getElementById('gs-salesperson').value = "";
        document.getElementById('gs-company').value = "Machinery Exchange";
        document.getElementById('gs-comments').value = "";

        // 1. Determine Company from current user email
        const omnisUser = (localStorage.getItem("omnisUser") || "").toLowerCase();
        let autoCompany = "Machinery Exchange"; // Default
        if (omnisUser.includes("sinopower") || omnisUser.includes("spz") || omnisUser.includes("sino")) {
          autoCompany = "Sinopower";
        } else if (omnisUser.includes("exchange") || omnisUser.includes("powerstar") || omnisUser.includes("mxg")) {
          autoCompany = "Machinery Exchange";
        }
        document.getElementById('gs-company').value = autoCompany;

        // Reset Suggestions only once
        if (!groupSalesInited) {
          setupSuggestions(document.getElementById('gs-customer'), document.getElementById('gs-customer-suggest'), "search_customer_for_omnis");
          setupSupabaseSuggestions(document.getElementById('gs-oem'), document.getElementById('gs-oem-suggest'), "brands", "name");

          // Model Select -> Auto fill OEM
          setupSupabaseSuggestions(document.getElementById('gs-model'), document.getElementById('gs-model-suggest'), "products", "item_name,item_code", (item) => {
            const oemInput = document.getElementById('gs-oem');
            if (item && item.brand) {
              oemInput.value = item.brand;
              oemInput.classList.remove('gs-input-error'); // Clear error on auto-fill
              oemInput.readOnly = true;
              oemInput.style.background = "#f1f5f9";
              oemInput.placeholder = "Auto-filled...";
              oemInput.style.animation = "pulse 0.5s ease-in-out";
              setTimeout(() => oemInput.style.animation = "", 500);
            } else {
              oemInput.value = "";
              oemInput.readOnly = false;
              oemInput.style.background = "#fff";
              oemInput.placeholder = "Select or Type OEM...";
              oemInput.focus();
            }
          });

          setupSuggestions(document.getElementById('gs-salesperson'), document.getElementById('gs-salesperson-suggest'), "search_salesperson_for_omnis");

          // Clear errors on input
          document.querySelectorAll('.gs-input').forEach(input => {
            input.addEventListener('input', () => {
              input.classList.remove('gs-input-error');
              // Hide summary if no errors left
              if (document.querySelectorAll('.gs-input-error').length === 0) {
                const summary = document.getElementById('gs-error-summary');
                if (summary) summary.classList.add('hidden');
              }
            });
            input.addEventListener('change', () => {
              input.classList.remove('gs-input-error');
              if (document.querySelectorAll('.gs-input-error').length === 0) {
                const summary = document.getElementById('gs-error-summary');
                if (summary) summary.classList.add('hidden');
              }
            });
          });

          groupSalesInited = true;
        }

        overlay.style.display = "flex";
      }
    }

    /* ===== GIFT LIST ===== */
    window._giftListAllRows = [];

    /* ===== NEW SALE EMAIL ALERT ===== */
    async function sendNewSaleAlert(payload, saleName) {
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
      if (!allAddresses.length) {
        console.warn('[Sale Alert] No recipients configured for', brandName);
        return;
      }

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
        ['Reference',        saleName                || '—'],
      ];

      const tableRows = rows.map(([label, val], i) => `
        <tr>
          <td style="padding:13px 20px;font-weight:700;color:#334155;background:${i%2===0?'#f8fafc':'#fff'};border-bottom:1px solid #e2e8f0;width:38%;">${label}</td>
          <td style="padding:13px 20px;color:#0f172a;background:${i%2===0?'#f8fafc':'#fff'};border-bottom:1px solid #e2e8f0;">${val}</td>
        </tr>`).join('');

      const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:Arial,'Helvetica Neue',sans-serif;background:#f0f4f8;">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
  <!-- Header -->
  <table style="width:100%;border-collapse:collapse;background:${brandColour};" cellpadding="0" cellspacing="0"><tr>
    <td style="padding:22px 28px;vertical-align:middle;">
      <img src="${logoUrl}" alt="${brandName}" style="display:block;height:40px;width:auto;">
    </td>
    <td style="padding:22px 28px;vertical-align:middle;text-align:right;">
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;">New Order Alert</div>
      <div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:4px;text-transform:uppercase;letter-spacing:.07em;">Sales Intelligence — ${sentDate}</div>
    </td>
  </tr></table>
  <!-- Banner -->
  <div style="background:#fef9c3;border-left:5px solid #f59e0b;padding:14px 28px;display:flex;align-items:center;gap:12px;">
    <span style="font-size:22px;">📋</span>
    <div>
      <div style="font-size:13px;font-weight:800;color:#92400e;">New Sale Logged &amp; Added to Order Tracking</div>
      <div style="font-size:12px;color:#78350f;margin-top:2px;">This order has been automatically recorded in the Omnis Order Tracking list.</div>
    </div>
  </div>
  <!-- Table -->
  <div style="padding:24px 28px 8px;">
    <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px;">Order Summary</div>
    <table style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:14px;" cellpadding="0" cellspacing="0">
      ${tableRows}
    </table>
  </div>
  <!-- Footer -->
  <div style="padding:20px 28px;border-top:1px solid #e2e8f0;margin-top:16px;">
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">This is an automated alert from <strong>Omnis SalesTrack</strong>. The order has been synced to the Order Tracking module and will be monitored for delivery milestones.</p>
  </div>
</div>
  
</body></html>`;

      // Queue one email per recipient
      const subject = `[NEW ORDER] ${payload.customer || 'Customer'} | ${payload.oem || ''} ${payload.model || ''} | ${brandName}`;
      const createdBy = localStorage.getItem('ft_user_email') || '';

      for (const addr of allAddresses) {
        const ccAddrs = allAddresses.filter(a => a !== addr);
        try {
          if (window.electron) {
            // Use email:send IPC — this queues AND delivers immediately via SMTP (EmailManager._deliverNow)
            const res = await window.electron.invoke('email:send', {
              to: addr,
              cc: ccAddrs.join(',') || undefined,
              subject,
              html: emailHtml,
              relatedDoc: saleName,
              relatedType: 'group_sale',
              createdBy
            });
            if (res?.ok) {
              console.log('[Sale Alert] Sent to:', addr);
            } else {
              console.warn('[Sale Alert] email:send error for', addr, res?.error);
            }
          } else {
            console.warn('[Sale Alert] window.electron not available for', addr);
          }
        } catch(e) { console.warn('[Sale Alert] Failed for', addr, e); }
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
<script>window.onload=function(){window.print();};<\/script>
  
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