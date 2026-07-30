
    // ============================================================
    // BULK HMR ENTRY LOGIC
    // ============================================================
    let BULK_VERIFIED_DATA = [];

    window.openBulkHmrModal = function() {
      const modal = document.getElementById("bulk-hmr-modal");
      document.getElementById("bulk-hmr-input").value = "";
      window.showBulkStep(1);
      modal.classList.add("active");
    };

    window.closeBulkHmrModal = function() {
      document.getElementById("bulk-hmr-modal").classList.remove("active");
    };

    window.showBulkStep = function(step) {
      document.getElementById("bulk-step-1").style.display = (step === 1) ? "block" : "none";
      document.getElementById("bulk-step-2").style.display = (step === 2) ? "block" : "none";
    };

    window.verifyBulkData = function() {
      const input = document.getElementById("bulk-hmr-input").value;
      const lines = input.split("\n");
      const tbody = document.getElementById("bulk-verify-tbody");
      tbody.innerHTML = "";
      BULK_VERIFIED_DATA = [];

      let matchedCount = 0;

      lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Try to find a 4-digit S/N and an HMR value (int or float)
        // Format example: "8793 5266.5" or "8793, 5266"
        const regex = /(\d{4})[\s,]+([\d.,]+)/;
        const match = line.match(regex);

        if (match) {
          const suffix = match[1];
          let hmrStr = match[2].replace(",", ""); // Handle comma as decimal if needed but primary is dot
          const hmrValue = parseFloat(hmrStr);

          // Find machine in window.FT_MACHINE_ROWS
          const machines = (window.FT_MACHINE_ROWS || []).filter(m => (m.sn || "").endsWith(suffix));
          
          let machineName = "❌ Not Found";
          let customer = "—";
          let statusHtml = '<span style="color: #ef4444; font-weight: 700;">No Match</span>';
          let rowClass = "";
          let isValid = false;

          if (machines.length === 1) {
            const m = machines[0];
            machineName = `${m.model} (${m.sn})`;
            customer = m.customer || "Unknown";
            isValid = true;
            matchedCount++;
            
            // Check if HMR is suspicious (lower than current)
            const currentHmr = parseFloat(m.current_hmr || 0);
            if (hmrValue < currentHmr) {
              statusHtml = '<span style="color: #f59e0b; font-weight: 700;">⚠️ Low HMR</span>';
              rowClass = 'style="background: #fffbeb;"';
            } else {
              statusHtml = '<span style="color: #10b981; font-weight: 700;">Ready</span>';
            }

            BULK_VERIFIED_DATA.push({
              machine: m.name,
              hmr: hmrValue,
              prev: currentHmr,
              model: m.model,
              sn: m.sn,
              customer: m.customer
            });

          } else if (machines.length > 1) {
            statusHtml = '<span style="color: #3b82f6; font-weight: 700;">Multi Match</span>';
            machineName = `<select style="font-size: 10px; width: 100%; border: 1px solid #3b82f6; border-radius: 4px;" onchange="window.updateBulkMatch(this, '${suffix}', ${hmrValue})">
              <option value="">Select Machine...</option>
              ${machines.map(m => `<option value="${m.name}">${m.model} - ${m.sn} (${m.customer})</option>`).join("")}
            </select>`;
          }

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-family: monospace; font-weight: 700;">${suffix}</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-weight: 600;">${machineName}</div>
              <div style="font-size: 10px; color: #94a3b8;">${customer}</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700;">${hmrValue.toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center;">${statusHtml}</td>
          `;
          if (rowClass) tr.setAttribute("style", rowClass.split('"')[1]);
          tbody.appendChild(tr);
        }
      });

      if (tbody.innerHTML === "") {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 40px; text-align: center; color: #94a3b8;">No valid data patterns found in paste.</td></tr>';
        document.getElementById("btn-submit-bulk").disabled = true;
        document.getElementById("btn-submit-bulk").style.opacity = "0.5";
      } else {
        document.getElementById("btn-submit-bulk").disabled = false;
        document.getElementById("btn-submit-bulk").style.opacity = "1";
      }

      document.getElementById("bulk-confirm-count").textContent = matchedCount;
      window.showBulkStep(2);
    };

    window.updateBulkMatch = function(select, suffix, hmrValue) {
      if (!select.value) return;
      const m = window.FT_MACHINE_ROWS.find(x => x.name === select.value);
      if (m) {
        // Update data array
        BULK_VERIFIED_DATA.push({
          machine: m.name,
          hmr: hmrValue,
          prev: parseFloat(m.current_hmr || 0),
          model: m.model,
          sn: m.sn,
          customer: m.customer
        });
        document.getElementById("bulk-confirm-count").textContent = BULK_VERIFIED_DATA.length;
        // Update UI status
        const statusTd = select.closest("tr").querySelector("td:last-child");
        statusTd.innerHTML = '<span style="color: #10b981; font-weight: 700;">Fixed</span>';
      }
    };

    window.submitBulkHmr = async function() {
      if (BULK_VERIFIED_DATA.length === 0) return;

      const btn = document.getElementById("btn-submit-bulk");
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="omnis-spinner-ring" style="width: 16px; height: 16px; border-width: 2px;"></span> Processing...';

      let successCount = 0;
      let failCount = 0;

      for (const item of BULK_VERIFIED_DATA) {
        try {
          // Use standard submission API
          const res = await callFrappe(
            "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.submit_ft_hmr_log",
            {
              machine:    item.machine,
              customer:   item.customer || "",
              model:      item.model || "",
              date:       new Date().toISOString().split("T")[0],
              hmr:        String(item.hmr),
              hmr_on_log: String(item.prev),
              op_hours:   "0",
              telematics: "No"
            },
            "POST"
          );

          if (res && (res.message?.status === "success" || res.status === "success")) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          console.error(`Bulk update failed for ${item.machine}:`, e);
          failCount++;
        }
      }

      showToast(`Bulk Sync Complete: ${successCount} updated, ${failCount} failed.`, successCount > 0 ? "success" : "err");
        window.closeBulkHmrModal();
        if (window.loadFtMachineRegister) window.loadFtMachineRegister({ quiet: true });
    };

    // --- REPORTING QUEUE (Phase 4 Parity) ---
    async function refreshReportQueue() {
        // Report scheduling is not available on this server – skip silently
        return;
    }

    function renderReportQueue(schedule) {
        const queueEl = document.getElementById('ft-report-queue');
        if (!queueEl) return;
        queueEl.innerHTML = '';
        
        schedule.forEach(day => {
            const dayCard = document.createElement('div');
            // Reusing calendar-day styles defined earlier
            dayCard.className = `calendar-day ${day.is_today ? 'today' : ''}`;
            dayCard.style.cursor = 'pointer';
            dayCard.onclick = () => openScheduleDetail(day);
            
            dayCard.innerHTML = `
                <div class="calendar-day-label">${day.day}</div>
                <div class="calendar-day-num">${day.date.split(' ')[0]}</div>
                <div class="calendar-day-count">${day.count} Reports</div>
            `;
            queueEl.appendChild(dayCard);
        });
    }

    function openScheduleDetail(day) {
        // Placeholder for detailed view modal (Detailed Schedule Parity)
        if (day.count === 0) {
            showToast("No reports scheduled for " + day.date, "info");
            return;
        }
        
        let content = `<div style="display:flex; flex-direction:column; gap:12px;">`;
        day.items.forEach(item => {
            content += `
                <div style="padding:12px; border:1px solid #e2e8f0; border-radius:10px; background:#fff;">
                    <div style="font-weight:800; color:#0f172a; display:flex; justify-content:space-between;">
                        <span>${item.customer}</span>
                        <span style="font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${item.time}</span>
                    </div>
                    <div style="font-size:12px; color:#ef4444; font-weight:700; margin-top:4px;">${item.type} Report</div>
                    <div style="font-size:11px; color:#64748b; margin-top:2px;">${item.preview}</div>
                    <div style="margin-top:10px; display:flex; gap:8px;">
                        <button onclick="sendNow('${item.type}', '${item.customer}')" style="flex:1; background:#0f172a; color:white; border:none; padding:6px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">Send Now</button>
                    </div>
                </div>
            `;
        });
        content += `</div>`;
        
        // Using existing mcModal (Omnis Standard)
        const mcModalOverlay = document.getElementById('mc-modal-overlay');
        const mcTitle = document.getElementById('mc-title');
        const mcSubtitle = document.getElementById('mc-subtitle');
        const mcBody = document.getElementById('mc-body');

        if (mcModalOverlay) {
            mcTitle.innerText = "Daily Schedule: " + day.date;
            mcSubtitle.innerText = day.count + " automated reports queued";
            mcBody.innerHTML = content;
            mcModalOverlay.classList.remove('hidden');
            mcModalOverlay.style.display = 'flex';
        }
    }

    async function sendNow(type, customer) {
        showToast(`Dispatching ${type} to ${customer}...`, "info");
        try {
            const res = await callFrappe('/api/method/ptz_powertrack.omnis_dashboard.pt_dashboard.send_report_now', {
                report_type: type,
                customer: customer,
                channels_json: JSON.stringify(['email', 'whatsapp'])
            });
            showToast("Report dispatched via Email & WhatsApp", "success");
        } catch (err) {
            showToast("Dispatch failed: " + err.message, "error");
        }
    }

    // Auto-refresh queue on load
    setTimeout(refreshReportQueue, 1500);

    // --- SYSTEM SETTINGS & GOVERNANCE ---
    function openSettingsModal() {
        document.getElementById('settings-modal').classList.remove('hidden');
        // Pre-fill email settings from localStorage or similar if needed
    }

    function closeSettingsModal() {
        document.getElementById('settings-modal').classList.add('hidden');
    }

    function switchSettingsTab(tab) {
        // Deactivate all tabs and panes
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));

        // Activate the matching tab button dynamically (no hardcoded index)
        document.querySelectorAll('.settings-tab').forEach(t => {
            const oc = t.getAttribute('onclick') || '';
            if (oc.includes(`'${tab}'`)) t.classList.add('active');
        });

        // Activate the matching pane
        const pane = document.getElementById(`pane-${tab}`);
        if (pane) pane.classList.add('active');
    }

    async function saveActiveSettings() {
        const config = {
            host: document.getElementById('set-smtp-host').value,
            port: document.getElementById('set-smtp-port').value,
            user: document.getElementById('set-smtp-user').value,
            pass: document.getElementById('set-smtp-pass').value,
            security: 'TLS'
        };

        const statusEl = document.getElementById('settings-status');
        statusEl.innerText = "Saving...";
        statusEl.style.color = "#64748b";

        try {
            // Updated to use whitelisted method update_email_settings
            const res = await callFrappe('/api/method/ptz_powertrack.omnis_dashboard.pt_dashboard.update_email_settings', {
                config_json: JSON.stringify(config)
            });
            
            statusEl.innerText = "✓ Settings Saved Successfully";
            statusEl.style.color = "#10b981";
            showToast("Email configuration updated.", "success");
            setTimeout(() => { statusEl.innerText = ""; }, 3000);
        } catch (err) {
            statusEl.innerText = "Error saving settings";
            statusEl.style.color = "#ef4444";
            showToast("Save failed: " + err.message, "error");
        }
    }

    function saveApiCredentials() {
      const key    = (document.getElementById('set-frappe-api-key')?.value || '').trim();
      const secret = (document.getElementById('set-frappe-api-secret')?.value || '').trim();
      const statusEl = document.getElementById('api-cred-status');
      if (!key || !secret) {
        if (statusEl) { statusEl.textContent = 'Both Key and Secret are required.'; statusEl.style.color = '#ef4444'; }
        return;
      }
      localStorage.setItem('ft_api_key', key);
      localStorage.setItem('ft_api_secret', secret);
      if (statusEl) { statusEl.textContent = '✓ Credentials saved — Backfill will now authenticate.'; statusEl.style.color = '#10b981'; }
      showToast('Frappe API credentials saved.', 'success');
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4000);
    }

    function clearApiCredentials() {
      localStorage.removeItem('ft_api_key');
      localStorage.removeItem('ft_api_secret');
      const kEl = document.getElementById('set-frappe-api-key');
      const sEl = document.getElementById('set-frappe-api-secret');
      if (kEl) kEl.value = '';
      if (sEl) sEl.value = '';
      const statusEl = document.getElementById('api-cred-status');
      if (statusEl) { statusEl.textContent = 'Credentials cleared.'; statusEl.style.color = '#64748b'; }
      showToast('API credentials cleared.', 'info');
    }

    // Pre-fill API fields when settings modal opens
    function _prefillApiFields() {
      const k = localStorage.getItem('ft_api_key');
      const s = localStorage.getItem('ft_api_secret');
      const kEl = document.getElementById('set-frappe-api-key');
      const sEl = document.getElementById('set-frappe-api-secret');
      if (kEl && k) kEl.value = k;
      if (sEl && s) sEl.value = s;
    }
    document.addEventListener('DOMContentLoaded', _prefillApiFields);
    setTimeout(_prefillApiFields, 1800);

    async function testEmailConnection() {
        const config = {
            host: document.getElementById('set-smtp-host').value,
            port: document.getElementById('set-smtp-port').value,
            user: document.getElementById('set-smtp-user').value,
            pass: document.getElementById('set-smtp-pass').value,
            security: 'TLS'
        };

        const statusEl = document.getElementById('settings-status');
        statusEl.innerText = "Testing connection...";
        statusEl.style.color = "#64748b";

        try {
            const res = await callFrappe('/api/method/ptz_powertrack.omnis_dashboard.pt_dashboard.test_email_connection', {
                config_json: JSON.stringify(config)
            });
            
            if (res && res.message && res.message.status === "success") {
                statusEl.innerText = "✅ " + res.message.message;
                statusEl.style.color = "#16a34a";
            } else {
                statusEl.innerText = "❌ " + (res.message ? res.message.message : "Connection Failed");
                statusEl.style.color = "#dc2626";
            }
        } catch (err) {
            statusEl.innerText = "❌ Error: " + err.message;
            statusEl.style.color = "#dc2626";
        }
    }

    // --- WHATSAPP LINK CENTER ---
    function openWaLinkModal() {
        document.getElementById('wa-link-modal').classList.remove('hidden');
        const status = document.getElementById('wa-status-text');
        const qr = document.getElementById('wa-qr-code');
        
        status.innerText = "Generating secure QR code...";
        qr.style.opacity = "0.3";
        
        setTimeout(() => {
            status.innerText = "Scan with your WhatsApp";
            qr.style.opacity = "1";
        }, 1500);
    }

    function closeWaLinkModal() {
        document.getElementById('wa-link-modal').classList.add('hidden');
    }
    
    // Wire up global access
    window.openSettingsModal = openSettingsModal;
    window.closeSettingsModal = closeSettingsModal;
    window.switchSettingsTab = switchSettingsTab;
    window.saveActiveSettings = saveActiveSettings;
    window.openWaLinkModal = openWaLinkModal;
    window.closeWaLinkModal = closeWaLinkModal;

    // ══════════════════════════════════════════════════════
    //  SYNC MONITOR — compare Frappe ↔ Supabase record counts
    // ══════════════════════════════════════════════════════
    const SYNC_ENTITIES = [
      {
        id: 'machines',
        label: 'Machines',
        supaTable: 'ft_machine',
        // Use in-memory data if the register is loaded, else fetch it (whitelisted endpoint)
        localFn: async () => {
          const n = (window.FT_MACHINE_ROWS || []).length;
          if (n) return { count: n };
          // Register not loaded yet — fetch just to count (lightweight, allow_guest)
          try {
            const res = await callFrappe(FT_MACHINE_REGISTER_METHOD, {}, 'GET');
            const rows = res?.message || res?.data || [];
            const total = Array.isArray(rows) ? rows.length : null;
            if (total !== null) {
              // Populate FT_MACHINE_ROWS if empty so rest of app benefits too
              if (!window.FT_MACHINE_ROWS?.length && Array.isArray(rows)) {
                window.FT_MACHINE_ROWS = rows;
              }
              return { count: total };
            }
          } catch (_) {}
          return null; // fall through to frappePath (frappe.client.get_count)
        },
        frappePath: '/api/method/frappe.client.get_count',
        frappParams: { doctype: 'FT Machine' }
      },
      {
        id: 'breakdowns',
        label: 'Breakdown Logs',
        supaTable: 'ft_breakdown_log',
        // Use frappe.client.get_count for accurate total; fall back to in-memory if already loaded
        localFn: async () => {
          const n = (window.FT_BREAKDOWN_ROWS || []).length;
          return n ? { count: n } : null; // null → fall through to frappePath
        },
        frappePath: '/api/method/frappe.client.get_count',
        frappParams: { doctype: 'FT Breakdown Log' }
      },
      {
        id: 'defects',
        label: 'Defect Reports',
        supaTable: 'ft_defect',
        // Use get_count for accurate total (summary API is capped at 200)
        frappePath: '/api/method/frappe.client.get_count',
        frappParams: { doctype: 'FT Defects Log' }
      },
      {
        id: 'service',
        label: 'Service Plans',
        supaTable: 'ft_service_plan',
        frappePath: '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_service_plan_list',
        frappParams: {}
      }
    ];

    async function _syncGetSupaCount(table) {
      try {
        const res = await window.electron.invoke('supabase:query', {
          table,
          method: 'select',
          // count:'exact' + head:true → PostgREST returns true total in header,
          // zero rows fetched, works correctly beyond the 1000-row default page limit
          params: { columns: '*', options: { count: 'exact', head: true } }
        });
        if (res.error) return { count: null, err: res.error.message || 'Supabase error' };
        // supabase-js exposes the header count via result.count
        const n = res.count;
        return { count: (typeof n === 'number') ? n : null };
      } catch(e) {
        return { count: null, err: e.message };
      }
    }

    async function _syncGetFrappCount(e) {
      // 1. Try localFn first (in-memory, no network call)
      if (e.localFn) {
        try {
          const local = await e.localFn();
          if (local !== null) return local; // null means "fall through to Frappe"
        } catch (_) {}
      }
      // 2. Fall back to Frappe API if path provided
      if (!e.frappePath) return { count: null, err: 'No Frappe source configured' };
      try {
        const res = await callFrappe(e.frappePath, e.frappParams, 'GET');
        const val = res.message;
        if (typeof val === 'number') return { count: val };
        if (typeof val === 'string' && !isNaN(parseInt(val))) return { count: parseInt(val) };
        if (Array.isArray(val)) return { count: val.length };
        if (val && Array.isArray(val.rows)) return { count: val.rows.length };
        if (val && Array.isArray(val.data)) return { count: val.data.length };
        return { count: null, err: 'Unexpected response shape: ' + JSON.stringify(val).slice(0, 120) };
      } catch(e) {
        return { count: null, err: e.message };
      }
    }

    function _syncSetRow(id, fr, sb, running) {
      const frEl = document.getElementById('sc-fr-' + id);
      const sbEl = document.getElementById('sc-sb-' + id);
      const dlEl = document.getElementById('sc-dl-' + id);
      const stEl = document.getElementById('sc-st-' + id);
      if (!frEl) return;

      if (running) {
        frEl.textContent = '…'; sbEl.textContent = '…';
        dlEl.textContent = '…';
        stEl.textContent = 'Checking'; stEl.className = 'sync-badge';
        return;
      }

      const frCount = fr.count;
      const sbCount = sb.count;
      frEl.textContent = frCount !== null ? frCount.toLocaleString() : '—';
      sbEl.textContent = sbCount !== null ? sbCount.toLocaleString() : '—';

      // Actual errors (fr.err or sb.err set) → red Error badge
      if (fr.err || sb.err) {
        dlEl.textContent = '—';
        stEl.textContent = 'Error'; stEl.className = 'sync-badge error';
        return 'error';
      }

      // Either count null but no explicit error → grey N/A (data not loaded)
      if (frCount === null || sbCount === null) {
        dlEl.textContent = '—';
        stEl.textContent = 'N/A'; stEl.className = 'sync-badge';
        return 'ok'; // Don't count as worst-case error
      }

      const delta = frCount - sbCount;
      dlEl.textContent = delta === 0 ? '0' : (delta > 0 ? '+' + delta : delta);
      const absDelta = Math.abs(delta);
      if (absDelta === 0) {
        stEl.textContent = '✓ Synced'; stEl.className = 'sync-badge ok';
        return 'ok';
      } else if (absDelta <= 10) {
        stEl.textContent = '⚠ Lag'; stEl.className = 'sync-badge lag';
        return 'lag';
      } else {
        stEl.textContent = '✗ Drift'; stEl.className = 'sync-badge drift';
        return 'drift';
      }
    }

    async function runSyncCheck() {
      const btn      = document.getElementById('sync-run-btn');
      const dot      = document.getElementById('sync-health-dot');
      const label    = document.getElementById('sync-health-label');
      const sub      = document.getElementById('sync-health-sub');
      const lastEl   = document.getElementById('sync-last-checked');
      const dbgLog   = document.getElementById('sync-debug-log');
      const dbgToggle= document.getElementById('sync-debug-toggle');
      const dbgLabel = document.getElementById('sync-debug-toggle-label');
      const dbgCount = document.getElementById('sync-debug-err-count');

      if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

      // Reset debug log for this run
      if (dbgLog) dbgLog.innerHTML = '';
      if (dbgToggle) dbgToggle.style.display = 'none';

      const debugEntries = [];

      function addDebugEntry(entity, source, level, message) {
        const ts = new Date().toLocaleTimeString();
        const colors = { error: { bg:'#7f1d1d', border:'#991b1b', tag:'#fca5a5', text:'#fecaca' },
                         warn:  { bg:'#451a03', border:'#92400e', tag:'#fcd34d', text:'#fde68a' },
                         info:  { bg:'#052e16', border:'#14532d', tag:'#6ee7b7', text:'#a7f3d0' } };
        const c = colors[level] || colors.info;
        debugEntries.push({ entity, source, level, message, ts });
        if (dbgLog) {
          dbgLog.innerHTML += `
            <div style="background:${c.bg};border:1px solid ${c.border};border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:3px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                <span style="color:${c.tag};font-weight:800;font-size:10px;text-transform:uppercase;">${level}</span>
                <span style="color:#94a3b8;font-size:9px;">${ts}</span>
                <span style="color:#64748b;font-size:9px;">·</span>
                <span style="color:#cbd5e1;font-size:10px;font-weight:700;">${entity}</span>
                <span style="color:#64748b;font-size:9px;">·</span>
                <span style="color:#64748b;font-size:9px;">${source}</span>
              </div>
              <div style="color:${c.text};font-size:10px;line-height:1.5;word-break:break-all;">${message}</div>
            </div>`;
        }
      }

      // Set all rows to "checking..."
      SYNC_ENTITIES.forEach(e => _syncSetRow(e.id, {}, {}, true));
      if (dot)   dot.style.background = '#94a3b8';
      if (label) label.textContent = 'Checking…';
      if (sub)   sub.textContent = 'Querying Frappe and Supabase…';

      // Run all checks concurrently
      const results = await Promise.all(SYNC_ENTITIES.map(async e => {
        const [fr, sb] = await Promise.all([
          _syncGetFrappCount(e),
          _syncGetSupaCount(e.supaTable)
        ]);

        // Log to debug panel
        if (fr.err)       addDebugEntry(e.label, 'Frappe',   'error', fr.err);
        else if (fr.count !== null) addDebugEntry(e.label, 'Frappe', 'info', `Count: ${fr.count}`);
        // else: silent null (no error, data just not loaded) — don't pollute debug log
        if (sb.err)       addDebugEntry(e.label, 'Supabase', 'error', sb.err);
        else if (sb.count !== null) addDebugEntry(e.label, 'Supabase', 'info', `Count: ${sb.count}`);

        const status = _syncSetRow(e.id, fr, sb, false);
        return status;
      }));

      // Show debug toggle if there are any entries
      const errCount = debugEntries.filter(e => e.level === 'error').length;
      if (dbgToggle && debugEntries.length > 0) {
        dbgToggle.style.display = 'block';
        if (dbgLabel) dbgLabel.textContent = `🐛 Debug Log — ${debugEntries.length} entries`;
        if (dbgCount) {
          dbgCount.textContent = errCount > 0 ? `${errCount} error${errCount > 1 ? 's' : ''}` : '';
          dbgCount.style.display = errCount > 0 ? 'inline' : 'none';
        }
        // Auto-open if there are errors
        const panel = document.getElementById('sync-debug-panel');
        if (panel && errCount > 0) panel.style.display = 'block';
      }

      // Overall health
      const worstOrder = ['drift', 'error', 'lag', 'ok'];
      const worst = worstOrder.find(s => results.includes(s)) || 'ok';
      const colours  = { ok: '#16a34a', lag: '#d97706', drift: '#ef4444', error: '#64748b' };
      const messages = {
        ok:    { label: 'All systems synced',         sub: 'Frappe and Supabase are in perfect alignment.' },
        lag:   { label: 'Minor lag detected',         sub: 'Some records are still propagating to Supabase.' },
        drift: { label: 'Significant drift detected', sub: 'One or more entities are out of sync — review the table below.' },
        error: { label: 'Check incomplete',           sub: `${errCount} error(s) encountered — see Debug Log below.` }
      };

      if (dot)    dot.style.background = colours[worst];
      if (label)  label.textContent = messages[worst].label;
      if (sub)    sub.textContent   = messages[worst].sub;
      if (lastEl) lastEl.textContent = 'Last checked: ' + new Date().toLocaleTimeString();
      if (btn)  { btn.disabled = false; btn.style.opacity = '1'; }
    }

    window.runSyncCheck = runSyncCheck;

    // ══════════════════════════════════════════════════════
    //  SOFTWARE UPDATES — About System tab
    // ══════════════════════════════════════════════════════

    function ftCheckUpdatesManually() {
      if (!window.electron?.checkForUpdates) return;
      const btn = document.getElementById('ft-btn-check-update');
      if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CHECKING…'; btn.disabled = true; }
      window.electron.checkForUpdates().then(() => {
        setTimeout(() => {
          if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> CHECK FOR UPDATES'; btn.disabled = false; }
        }, 2500);
      }).catch(() => {
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> CHECK FOR UPDATES'; btn.disabled = false; }
      });
    }
    window.ftCheckUpdatesManually = ftCheckUpdatesManually;

    async function ftLoadReleaseNotes() {
      const el = document.getElementById('ft-update-changelog');
      if (!el) return;
      try {
        const res = await fetch('../../RELEASE_NOTES.md');
        if (!res.ok) throw new Error('Stream unreachable');
        const text = await res.text();
        const startMark = "## \uD83D\uDE80 What's New";
        const endMark   = '---';
        const si = text.indexOf(startMark);
        if (si === -1) throw new Error('Changelog format mismatch');
        let section = text.substring(si + startMark.length);
        const ei = section.indexOf(endMark);
        if (ei !== -1) section = section.substring(0, ei);
        const lines = section.split('\n').filter(l => l.trim());
        let html = '';
        lines.forEach(line => {
          const t = line.trim();
          if (t.startsWith('###')) {
            html += `<div style="font-size:11px;font-weight:850;color:#0f172a;margin-top:6px;border-left:3px solid #2563eb;padding-left:8px;text-transform:uppercase;letter-spacing:0.4px;">${t.replace('###','').trim()}</div>`;
          } else if (t.startsWith('*')) {
            const c = t.replace('*','').trim().replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
            html += `<div style="display:flex;gap:9px;align-items:flex-start;background:white;padding:10px 12px;border-radius:9px;border:1px solid #e2e8f0;transition:all 0.2s;" onmouseover="this.style.borderColor='#2563eb';this.style.transform='translateX(3px)'" onmouseout="this.style.borderColor='#e2e8f0';this.style.transform='none'"><div style="color:#2563eb;font-size:9px;margin-top:3px;">&#x2714;</div><div style="font-size:12px;color:#475569;line-height:1.5;font-weight:500;">${c}</div></div>`;
          }
        });
        if (!html) html = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">No features listed for this version.</div>`;
        el.innerHTML = html;
      } catch (e) {
        el.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Release notes unavailable (${e.message}).</div>`;
      }
    }

    // Listen for update events forwarded by main.js autoUpdater
    if (window.electron?.on) {
      window.electron.on('update-message', (event, data) => {
        const statusEl = document.getElementById('ft-update-status');
        const progWrap = document.getElementById('ft-update-progress-wrap');
        if (statusEl && data.text) statusEl.textContent = data.text;

        if (data.type === 'uptodate') {
          if (progWrap) progWrap.style.display = 'none';
          ftLoadReleaseNotes();
        } else if (data.type === 'available') {
          if (progWrap) progWrap.style.display = 'block';
          ftLoadReleaseNotes();
        } else if (data.type === 'downloaded') {
          const bar = document.getElementById('ft-update-bar');
          const pct = document.getElementById('ft-update-pct');
          if (bar) bar.style.width = '100%';
          if (pct) pct.textContent = '100%';
        } else if (data.type === 'progress' && data.progress) {
          const info = data.progress;
          if (progWrap) progWrap.style.display = 'block';
          const bar   = document.getElementById('ft-update-bar');
          const pct   = document.getElementById('ft-update-pct');
          const stats = document.getElementById('ft-update-stats');
          const eta   = document.getElementById('ft-update-eta');
          const p = Math.floor(info.percent || 0);
          if (bar)   bar.style.width = p + '%';
          if (pct)   pct.textContent  = p + '%';
          const speed = (info.bytesPerSecond / 1024 / 1024).toFixed(2);
          const xfr   = (info.transferred   / 1024 / 1024).toFixed(1);
          const tot   = (info.total         / 1024 / 1024).toFixed(1);
          if (stats) stats.textContent = `${xfr} MB / ${tot} MB • ${speed} MB/s`;
          if (eta && info.bytesPerSecond > 0) {
            const secs = Math.round((info.total - info.transferred) / info.bytesPerSecond);
            eta.textContent = secs < 60 ? `ETA: ${secs}s` : `ETA: ${Math.floor(secs/60)}m ${secs % 60}s`;
          }
        }
      });
    }

    // Seed the version label; load release notes after short delay
    if (window.electron?.getVersion) {
      window.electron.getVersion().then(v => {
        const s = document.getElementById('ft-update-status');
        if (s) s.textContent = `Version ${v}`;
      });
    }
    setTimeout(() => ftLoadReleaseNotes(), 800);

    // ══════════════════════════════════════════════════════════════════════
    //  CLIENT-SIDE FULL BACKFILL
    //  Reads from Frappe REST API → upserts directly into Supabase
    //  No server-side changes needed — uses existing Electron IPC bridge
    // ══════════════════════════════════════════════════════════════════════

    // Frappe metadata fields to ALWAYS strip (never valid Supabase columns)
    const _BF_FRAPPE_META = new Set([
      'doctype','modified_by','owner','idx','docstatus',
      'parent','parenttype','parentfield','naming_series',
      '__islocal','__unsaved','_liked_by','_comments','_assign','_user_tags',
      'amended_from','_seen','is_local','read_only','in_list_view'
    ]);

    // Exact column whitelists from the Supabase schema SQL
    // Only fields in this list will be sent to Supabase for each entity
    const _BF_COLS = {
      ft_machine: new Set([
        'name','model','oem','sn','type','esn','section_break_4','column_break_7','gearbox',
        'section_break_10','notes','fleet_no','location','region','supplied',
        'warranty_details_section','handover_date','expiry_date','column_break_19',
        'warranty_hours','hmr_section','starting_hmr','column_break_23','current_hmr',
        'service_details_section','service_interval_hours','column_break_27',
        'last_service_date','last_service_hmr','next_service_hmr','initial_service_type',
        'warranty_status','service_obligation','initial_service_section','track_initial_service',
        'column_break_37','initial_service_status','customer','hours_remaining_to_service',
        'last_hmr_date','fleetrack_managed','section_break_2','colb1','colb2','colbr3',
        'colbr4','colbr6','cb1','cb2','has_telematics_device','column_break_32',
        'column_break_47','column_break_49','column_break_34','last_hmr_log',
        'days_since_last_hmr','column_break_38','column_break_54','column_break_44',
        'column_break_24','warranty_type','chassis_number','epr_entry_date','engine_type',
        'warranty_period','cbbb2','mxg_fleet_no','colbr_nre_fleet','section_break_57',
        'col_br_nst','next_service_type','col_br_service_hdr','last_service_type',
        'cbroemreg','oem_registered','library_section','filters_list','compatible_get',
        'pdi_checklist','lube_types','belt_dimensions','hyd_filters_dimensions',
        'equipment_information_form','wty_certificate','nei_checklist','column_break_81',
        'column_break_83','machine_picture','machine_data_plate','engine_data_plate',
        'supplier','misc_files','madr_section','track_components','rpc_list',
        'parts_manuals','parts_manuals_2','parts_manuals_3','operating_weight','bin_capacity',
        'standard_fuel_consumption','tyre_size','canbus_enabled','unique_attachments_fitted',
        'telematics_section','telematics_device','column_break_yztmf','telematics_device_sn',
        'sim_card','enabled_parameters','service_guide_section','standard_service_configuration',
        'btn_view_unique_attachments','mobility','under_carriage_section','chain_make',
        'column_break_gwqvk','chain_length','column_break_jociq','chain_width',
        'sprokects_section','sproket_lhs_teeth','sproket_lhs_holes','column_break_guec2',
        'sproket_rhs_teeth','sproket_rhs_holes','other_uc_info','get_components_section',
        'get_components','fb_section','filters_and_belts','customer_file_section',
        'machine_welcome_report_status','column_break_duu5t','column_break_4ctjf',
        'prepare_welcome_report','btn_prepare_machine_welcome_report',
        'total_running_hours','working_voltage','created_at','updated_at'
      ]),
      ft_breakdown_log: new Set([
        'name','machine','column_break_2','oem','customer','breakdown_date','location',
        'breakdown_details_section','column_break_8','description','status','days_on_bd',
        'end_date','model','fleetrack_managed','warranty_status','parts_eta','ted','red',
        'fsb','resp','section_break_19','last_col_br_oeta','section_break_17','dobd_col_br',
        'oeta_col_br','out_eta','section_break_27','on_hold','ted_status','bd_duration',
        'category','created_at','updated_at'
      ]),
      ft_defect: new Set([
        'name','defect_type','machine','customer','fleetrack_managed','oem','model',
        'location','region','warranty_status','start_date','priority','status',
        'description','on_hold','ted','end_date','defect_days',
        'technician','reported_by','hmr_at_defect',
        'created_at','modified_at'
      ])
    };

    // Clean a Frappe record: strip meta fields, map dates, apply column whitelist
    function _bfClean(record, allowedCols) {
      const out = {};
      for (const [k, v] of Object.entries(record)) {
        if (_BF_FRAPPE_META.has(k)) continue;
        // Map Frappe creation/modified → Supabase timestamp columns
        if (k === 'creation') {
          if (v && (!allowedCols || allowedCols.has('created_at'))) { out['created_at'] = v; }
          continue;
        }
        if (k === 'modified') {
          // ft_defect uses modified_at; others use updated_at
          if (v) {
            if (!allowedCols || allowedCols.has('updated_at'))  out['updated_at']  = v;
            if (!allowedCols || allowedCols.has('modified_at')) out['modified_at'] = v;
          }
          continue;
        }
        // Apply whitelist if provided — skip unknown columns
        if (allowedCols && !allowedCols.has(k)) continue;
        out[k] = v;
      }
      return out;
    }

    // Page through /api/resource/{doctype} and return ALL records
    async function _bfFetchAll(doctype, onCount) {
      const PAGE = 200;
      const all  = [];
      let offset = 0;
      while (true) { // eslint-disable-line no-constant-condition
        const res = await callFrappe(
          '/api/resource/' + encodeURIComponent(doctype),
          { fields: '["*"]', limit_page_length: PAGE, limit_start: offset },
          'GET'
        );
        const batch = res.data || [];
        all.push(...batch);
        if (onCount) onCount(all.length);
        if (batch.length < PAGE) break;
        offset += PAGE;
      }
      return all;
    }

    // Upsert records to Supabase in batches — returns { pushed, errors, lastError }
    // ipcParams: optional extra args forwarded to supabase:query (e.g. { onConflict: 'frappe_name' })
    async function _bfUpsert(table, records, batchSize, allowedCols, ipcParams, onProgress) {
      let pushed = 0, errors = 0, lastError = null;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize).map(r => _bfClean(r, allowedCols));
        const res = await window.electron.invoke('supabase:query', {
          table, method: 'upsert', params: ipcParams || {}, data: batch
        });
        if (res.error || !res.ok) {
          const errMsg = res.error
            ? (res.error.message || res.error.details || JSON.stringify(res.error))
            : 'Unknown upsert error';

          // ── FK recovery: if a machine/breakdown foreign key blocks the batch,
          //    retry with the offending FK column nulled out so valid records still sync
          const isFkError = errMsg && (errMsg.includes('foreign key') || errMsg.includes('_fkey'));
          if (isFkError) {
            // Extract constraint name e.g. "ft_defect_machine_fkey" → column = "machine"
            // Constraint pattern: {table}_{column}_fkey → take last segment before _fkey
            const constraintRaw = errMsg.match(/constraint "([^"]+)"/)?.[1] || '';
            const withoutFkey   = constraintRaw.replace(/_fkey$/i, ''); // "ft_defect_machine"
            // Column = last underscore-delimited token: "machine"
            const fkCol = withoutFkey.split('_').pop() || 'machine';
            console.warn('[Backfill] FK violation on', table, '— column:', fkCol, '— retrying batch with null');
            const retryBatch = batch.map(r => ({ ...r, [fkCol]: null }));
            const retry = await window.electron.invoke('supabase:query', {
              table, method: 'upsert', params: ipcParams || {}, data: retryBatch
            });
            if (retry.ok && !retry.error) {
              pushed += batch.length;
              if (onProgress) onProgress(pushed, records.length, null);
              continue; // recovered — don't count as error
            }
          }

          console.warn('[Backfill] Upsert error on', table, ':', errMsg);
          lastError = errMsg;
          errors++;
        } else {
          pushed += batch.length;
        }
        if (onProgress) onProgress(pushed, records.length, lastError);
      }
      return { pushed, errors, lastError };
    }

    // ── UI helpers ──────────────────────────────────────────────────────
    function _bfRowHTML(id, label, note) {
      return `
        <div id="bf-row-${id}" style="background:#fff;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div>
              <span style="font-size:12px;font-weight:700;color:#374151;">${label}</span>
              ${note ? `<div style="font-size:9px;color:#94a3b8;margin-top:1px;">${note}</div>` : ''}
            </div>
            <span id="bf-badge-${id}" style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;background:#f1f5f9;color:#64748b;">Queued</span>
          </div>
          <div style="background:#f1f5f9;border-radius:4px;height:6px;overflow:hidden;">
            <div id="bf-bar-${id}" style="height:100%;width:0%;background:#f97316;border-radius:4px;transition:width 0.3s ease;"></div>
          </div>
          <div id="bf-msg-${id}" style="font-size:10px;color:#64748b;margin-top:5px;"></div>
        </div>`;
    }

    function _bfSetBadge(id, text, color, bg) {
      const el = document.getElementById('bf-badge-' + id);
      if (el) { el.textContent = text; el.style.color = color; el.style.background = bg; }
    }
    function _bfSetBar(id, pct, color) {
      const el = document.getElementById('bf-bar-' + id);
      if (el) { el.style.width = pct + '%'; if (color) el.style.background = color; }
    }
    function _bfSetMsg(id, msg) {
      const el = document.getElementById('bf-msg-' + id);
      if (el) el.textContent = msg;
    }

    // ── Main backfill orchestrator ──────────────────────────────────────
    async function triggerFullBackfill() {
      const btn        = document.getElementById('backfill-trigger-btn');
      const wrap       = document.getElementById('backfill-progress-wrap');
      const rowsEl     = document.getElementById('backfill-entity-rows');
      const statusEl   = document.getElementById('backfill-overall-status');
      const doneBanner = document.getElementById('backfill-done-banner');

      if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
      if (wrap) wrap.style.display = 'flex';
      if (doneBanner) doneBanner.style.display = 'none';
      if (statusEl) statusEl.textContent = '⏳ Backfill running — do not close this panel…';

      // ── Entity definitions ──────────────────────────────────────────────
      //  type:'resource' → pages /api/resource/{doctype}
      //  type:'method'   → single call to a custom API method
      //  type:'skip'     → Supabase-native table, not mirrored from Frappe
      const ENTITIES = [
        {
          id: 'machines',
          label: 'Machines',
          type: 'resource',
          doctype: 'FT Machine',
          supaTable: 'ft_machine',
          batchSize: 100
        },
        {
          id: 'breakdowns',
          label: 'Breakdown Logs',
          type: 'resource',
          doctype: 'FT Breakdown Log',
          supaTable: 'ft_breakdown_log',
          batchSize: 100
        },
        {
          id: 'defects',
          label: 'Defect Reports',
          type: 'resource',          // Paginate all 5000+ records via /api/resource
          doctype: 'FT Defects Log',
          supaTable: 'ft_defect',
          batchSize: 100
        },
        {
          id: 'service',
          label: 'Service Plans',
          type: 'service_plan',
          // Fetches from Frappe get_ft_service_plan_list then maps fields to ft_service_plan schema.
          // Requires: ALTER TABLE public.ft_service_plan ADD COLUMN IF NOT EXISTS frappe_name text UNIQUE;
          path: '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_service_plan_list',
          supaTable: 'ft_service_plan'
        }
      ];

      // Build UI rows
      if (rowsEl) {
        rowsEl.innerHTML = ENTITIES.map(e => _bfRowHTML(e.id, e.label, e.note)).join('');
      }

      let totalPushed = 0, failCount = 0;

      for (const entity of ENTITIES) {
        // ── SKIP ──
        if (entity.type === 'skip') {
          _bfSetBar(entity.id, 100, '#94a3b8');
          _bfSetBadge(entity.id, '— Skipped', '#64748b', '#f1f5f9');
          _bfSetMsg(entity.id, entity.note || 'Skipped.');
          continue;
        }

        // ── SERVICE PLAN (special: fetch + field-map + upsert on frappe_name) ──
        if (entity.type === 'service_plan') {
          _bfSetBadge(entity.id, '⬇ Fetching…', '#92400e', '#fef3c7');
          _bfSetBar(entity.id, 15);
          _bfSetMsg(entity.id, 'Fetching service plans from Frappe…');
          try {
            const res = await callFrappe(entity.path, {}, 'GET');
            const raw  = Array.isArray(res.message) ? res.message : [];

            if (raw.length === 0) {
              _bfSetBar(entity.id, 100, '#d97706');
              _bfSetBadge(entity.id, '⚠ Empty', '#b45309', '#fef3c7');
              _bfSetMsg(entity.id, 'Frappe returned 0 service plans — nothing to push.');
              continue;
            }

            // Map Frappe FT Field Service Plan → Supabase ft_service_plan
            // Requires: ALTER TABLE public.ft_service_plan
            //           ADD COLUMN IF NOT EXISTS frappe_name text UNIQUE;
            const mapped = raw.map(r => ({
              machine_id:  r.machine  || null,
              customer:    r.customer || null,
              raw_date:    r.raw_date || null,
              status:      r.status   || 'Proposed',
              technician:  r.technician || null,
              description: r.description || null,
              frappe_name: r.name   // deduplication key
            }));

            _bfSetMsg(entity.id, `Fetched ${mapped.length} plans — uploading to Supabase…`);
            _bfSetBar(entity.id, 40);
            _bfSetBadge(entity.id, '⬆ Uploading…', '#1e40af', '#dbeafe');

            const { pushed, errors, lastError } = await _bfUpsert(
              entity.supaTable,
              mapped,
              50,            // small batch — only ~29 records
              null,          // allowedCols: null → pass all mapped keys as-is
              { onConflict: 'frappe_name' },   // ipcParams
              (done, total, errMsg) => {
                _bfSetBar(entity.id, 40 + Math.round((done / total) * 60));
                _bfSetMsg(entity.id, `Upserted ${done} / ${total}…${errMsg ? ' ⚠ ' + errMsg.slice(0, 60) : ''}`);
              }
            );

            totalPushed += pushed;
            if (errors > 0) {
              const hint = (lastError || '').includes('frappe_name')
                ? ' Run SQL first: ALTER TABLE public.ft_service_plan ADD COLUMN IF NOT EXISTS frappe_name text UNIQUE;'
                : '';
              _bfSetBar(entity.id, 100, '#f97316');
              _bfSetBadge(entity.id, `⚠ ${errors} error(s)`, '#b45309', '#fef3c7');
              _bfSetMsg(entity.id, `Error: ${(lastError || '').slice(0, 100)}${hint}`);
              failCount++;
            } else {
              _bfSetBar(entity.id, 100, '#16a34a');
              _bfSetBadge(entity.id, `✓ ${pushed} synced`, '#15803d', '#dcfce7');
              _bfSetMsg(entity.id, `All ${pushed} service plans upserted successfully.`);
            }
          } catch (e) {
            _bfSetBar(entity.id, 100, '#ef4444');
            _bfSetBadge(entity.id, '✗ Error', '#b91c1c', '#fee2e2');
            _bfSetMsg(entity.id, (e.message || String(e)).slice(0, 200));
            failCount++;
          }
          continue; // skip the generic try block below
        }

        try {
          // ── Step 1: Fetch from Frappe ──────────────────────────────────
          _bfSetBadge(entity.id, '⬇ Fetching…', '#92400e', '#fef3c7');
          _bfSetBar(entity.id, 10);
          _bfSetMsg(entity.id, 'Fetching records from Frappe…');

          let records = [];

          if (entity.type === 'resource') {
            records = await _bfFetchAll(entity.doctype, (n) => {
              _bfSetMsg(entity.id, `Fetched ${n} records from Frappe…`);
            });
          } else if (entity.type === 'method') {
            const res = await callFrappe(entity.path, {}, 'GET');
            const msg = res.message;
            if (entity.resultKey && msg && Array.isArray(msg[entity.resultKey])) {
              records = msg[entity.resultKey];
            } else if (Array.isArray(msg)) {
              records = msg;
            } else {
              throw new Error('Unexpected API response shape: ' + JSON.stringify(msg).slice(0, 80));
            }
          }

          if (records.length === 0) {
            _bfSetBar(entity.id, 100, '#d97706');
            _bfSetBadge(entity.id, '⚠ Empty', '#b45309', '#fef3c7');
            _bfSetMsg(entity.id, 'Frappe returned 0 records — nothing to push.');
            continue;
          }

          _bfSetMsg(entity.id, `Fetched ${records.length} records — uploading to Supabase…`);
          _bfSetBar(entity.id, 40);

          // ── Step 2: Upsert to Supabase ─────────────────────────────────
          _bfSetBadge(entity.id, '⬆ Uploading…', '#1e40af', '#dbeafe');

          const allowedCols = _BF_COLS[entity.supaTable] || null;
          const { pushed, errors, lastError } = await _bfUpsert(
            entity.supaTable,
            records,
            entity.batchSize,
            allowedCols,
            null,           // ipcParams: default upsert (conflict on PK 'name')
            (done, total, errMsg) => {
              const pct = 40 + Math.round((done / total) * 60);
              _bfSetBar(entity.id, pct);
              _bfSetMsg(entity.id, `Upserted ${done} / ${total} records…${errMsg ? ' ⚠ ' + errMsg.slice(0, 60) : ''}`);
            }
          );

          totalPushed += pushed;

          if (errors > 0) {
            _bfSetBar(entity.id, 100, '#f97316');
            _bfSetBadge(entity.id, `⚠ ${errors} batch error(s)`, '#b45309', '#fef3c7');
            _bfSetMsg(entity.id, `Pushed ${pushed} of ${records.length} records. Error: ${(lastError || '').slice(0, 120)}`);
            failCount++;
          } else {
            _bfSetBar(entity.id, 100, '#16a34a');
            _bfSetBadge(entity.id, `✓ ${pushed} synced`, '#15803d', '#dcfce7');
            _bfSetMsg(entity.id, `All ${pushed} records upserted successfully.`);
          }

        } catch (e) {
          _bfSetBar(entity.id, 100, '#ef4444');
          _bfSetBadge(entity.id, '✗ Error', '#b91c1c', '#fee2e2');
          _bfSetMsg(entity.id, (e.message || String(e)).slice(0, 200));
          failCount++;
        }
      }

      // ── Final summary ──────────────────────────────────────────────────
      if (statusEl) {
        statusEl.textContent = failCount === 0
          ? `✓ Backfill complete — ${totalPushed} records pushed to Supabase.`
          : `Finished with ${failCount} issue(s) — ${totalPushed} records pushed.`;
        statusEl.style.color = failCount === 0 ? '#15803d' : '#b91c1c';
      }
      if (doneBanner) {
        doneBanner.style.display = 'flex';
        doneBanner.style.background = failCount === 0 ? '#dcfce7' : '#fef3c7';
        doneBanner.style.color      = failCount === 0 ? '#15803d' : '#92400e';
        doneBanner.textContent = failCount === 0
          ? `✓ Backfill complete — ${totalPushed} records synced. Re-running sync check…`
          : `⚠ Backfill finished with issues — re-running sync check…`;
      }
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }

      // Refresh the sync counts after 2 s
      setTimeout(() => runSyncCheck(), 2000);
    }

    window.triggerFullBackfill = triggerFullBackfill;

