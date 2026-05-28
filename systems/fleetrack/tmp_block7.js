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
        const queueEl = document.getElementById('ft-report-queue');
        if (!queueEl) return;
        
        try {
            // Using same reporting backend as Powertrack
            const res = await callFrappe('/api/method/ptz_powertrack.omnis_dashboard.pt_dashboard.get_report_schedule', {});
            if (res && res.message && res.message.schedule) {
                renderReportQueue(res.message.schedule);
            }
        } catch (err) {
            console.error("Queue refresh failed:", err);
        }
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
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
        
        const tabs = {
            'email': 0,
            'licensing': 1,
            'about': 2
        };
        document.querySelectorAll('.settings-tab')[tabs[tab]].classList.add('active');
        document.getElementById(`pane-${tab}`).classList.add('active');
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