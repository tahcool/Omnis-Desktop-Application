/**
 * fix_ftas_load.js
 * Patches window.ftAsLoad to query aftersales_handover from Supabase directly,
 * bypassing the broken IPC cache:getAll('orders') call which hangs when
 * syncManager.getCached is not implemented for the orders table.
 *
 * Run this from main.js via: win.webContents.executeJavaScript(...)
 * Or inject via the app's existing script-injection mechanism.
 */

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SUPABASE_KEY = 'sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';

const patchedLoad = `
(function() {
  'use strict';

  var SUPABASE_URL = '${SUPABASE_URL}';
  var SUPABASE_KEY = '${SUPABASE_KEY}';

  /* ── Patched ftAsLoad: reads from aftersales_handover table directly ── */
  window.ftAsLoad = async function() {
    var body = document.getElementById('ftas-body');
    if (!body) return;
    body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#94a3b8;"><span style="font-size:24px;margin-right:12px;">&#9203;</span><span style="font-size:15px;font-weight:600;">Loading aftersales records...</span></div>';

    try {
      /* ── Primary: query aftersales_handover table from Supabase ── */
      var res = await fetch(SUPABASE_URL + '/rest/v1/aftersales_handover?order=created_at.desc&limit=500', {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json'
        }
      });

      var recs = [];
      if (res.ok) {
        recs = await res.json();
        console.log('[FT After-Sales PATCHED] Loaded', recs.length, 'records from Supabase');
      } else {
        console.warn('[FT After-Sales PATCHED] Supabase fetch failed:', res.status);
      }

      /* ── Also try IPC with a 3-second timeout as secondary source ── */
      try {
        if (window.electron && window.electron.ipcRenderer) {
          var ipcResult = await Promise.race([
            window.electron.ipcRenderer.invoke('cache:getAll', 'orders'),
            new Promise(function(resolve) { setTimeout(function() { resolve({ ok: false, timeout: true }); }, 3000); })
          ]);

          if (ipcResult && ipcResult.ok && Array.isArray(ipcResult.data) && ipcResult.data.length > 0) {
            var orders = ipcResult.data;
            var handedOrders = orders.filter(function(o) {
              var s = (o.status || o.phase || '').toLowerCase();
              return s.includes('handed') || s.includes('handover') || s.includes('delivered') || s.includes('complete');
            });

            /* Merge: only add orders not already in Supabase records */
            var existingOrderIds = new Set(recs.map(function(r) { return r.order_id || ''; }));
            handedOrders.forEach(function(o) {
              var ordId = o.name || o.frappe_id || o.report_id || '';
              if (!existingOrderIds.has(ordId)) {
                recs.push({
                  id: 'AS-' + ordId,
                  order_id: ordId,
                  company: o.customer || o.customer_name || '',
                  equipment_model: o.machine || o.model || o.item || '',
                  chassis_number: o.chassis_number || o.serial_no || '',
                  oem: o.brand || o.oem || '',
                  date_of_sale: o.order_date || o.date || '',
                  handover_date: o.handover_date || o.revised_handover || o.target_handover || '',
                  handover_salesperson: o.salesperson || '',
                  status: 'Pending',
                  training_done: 'No'
                });
              }
            });
          } else if (ipcResult && ipcResult.timeout) {
            console.log('[FT After-Sales PATCHED] IPC timed out, using Supabase data only');
          }
        }
      } catch(ipcErr) {
        console.warn('[FT After-Sales PATCHED] IPC unavailable:', ipcErr.message);
      }

      /* Set global records */
      if (typeof window._ftAsRecords !== 'undefined') {
        window._ftAsRecords = recs;
      }

      /* Populate company filter */
      var companies = ['All'].concat([...new Set(recs.map(function(r) { return r.company || ''; }).filter(Boolean))].sort());
      var cf = document.getElementById('ftas-company-filter');
      if (cf) {
        var current = cf.value;
        cf.innerHTML = companies.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
        cf.value = companies.includes(current) ? current : 'All';
      }

      /* Update stat pills */
      var pending   = recs.filter(function(r) { return (r.status || 'Pending') === 'Pending'; }).length;
      var completed = recs.filter(function(r) { return r.status === 'Completed'; }).length;
      var ep = document.getElementById('ftas-pending-label');   if (ep) ep.textContent = pending + ' Pending';
      var ec = document.getElementById('ftas-completed-label'); if (ec) ec.textContent = completed + ' Completed';
      var ep2 = document.getElementById('aftersales-stat-pending');   if (ep2) { var b = ep2.querySelector('span'); if(b) b.textContent = pending + ' Pending'; }
      var ec2 = document.getElementById('aftersales-stat-completed'); if (ec2) { var b = ec2.querySelector('span'); if(b) b.textContent = completed + ' Completed'; }

      if (typeof window.ftAsRender === 'function') {
        window.ftAsRender();
      } else {
        /* Minimal fallback render if ftAsRender not available */
        if (!recs.length) {
          body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;color:#94a3b8;"><span style="font-size:40px;margin-bottom:12px;">&#10004;</span><span style="font-size:16px;font-weight:700;color:#334155;">No handover records found.</span></div>';
        } else {
          body.innerHTML = recs.map(function(r) {
            var isPending = (r.status || 'Pending') === 'Pending';
            var badge = isPending
              ? '<span style="font-size:10px;font-weight:800;background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:20px;">PENDING</span>'
              : '<span style="font-size:10px;font-weight:800;background:#d1fae5;color:#047857;padding:2px 10px;border-radius:20px;">COMPLETED</span>';
            return '<div style="display:flex;align-items:center;padding:14px 20px;border-bottom:1px solid #f1f5f9;gap:14px;">' +
              '<div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;">' +
              '<span style="font-size:15px;font-weight:900;color:#0f172a;">' + (r.company || 'Unknown') + '</span>' + badge +
              '</div>' +
              (r.equipment_model ? '<div style="font-size:13px;font-weight:700;color:#334155;">' + (r.oem ? r.oem + ' ' : '') + r.equipment_model + '</div>' : '') +
              '</div></div>';
          }).join('');
        }
      }

    } catch(e) {
      console.error('[FT After-Sales PATCHED] Error:', e);
      body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#ef4444;"><span>Failed to load: ' + e.message + '</span></div>';
    }
  };

  console.log('[FT After-Sales] ftAsLoad patched — Supabase-direct with IPC fallback');

  /* Auto-reload if the view is currently visible */
  var view = document.getElementById('view-aftersales');
  if (view && !view.classList.contains('hidden') && view.style.display !== 'none') {
    window.ftAsLoad();
  }
})();
`;

const fs = require('fs');
fs.writeFileSync(__dirname + '/ftas_patch.js', patchedLoad, 'utf8');
console.log('Patch written to ftas_patch.js');
console.log('To apply: run this in the Electron DevTools console, or paste ftas_patch.js contents directly.');
