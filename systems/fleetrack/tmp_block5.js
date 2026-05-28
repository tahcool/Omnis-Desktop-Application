    // --- AUTHENTICATION LOGIC ---

    function checkLoginAndInit() {
      const isFile = window.location.origin === "null" || window.location.origin.startsWith("file");

      // Only enforce login check if running as file (Electron)
      if (isFile) {
        // Check for either old API key auth OR new cookie-based auth
        const hasApiKey = localStorage.getItem("ft_api_key");
        const hasUserEmail = localStorage.getItem("ft_user_email");
        const hasOmnisUser = localStorage.getItem("omnisUser");
        const isFleetrackSession = localStorage.getItem("omnisSystemKey") === "fleetrack";

        // Allow access if ANY valid auth method is present
        if (!hasApiKey && !hasUserEmail && !hasOmnisUser) {
          console.log("[Fleetrack Auth] No credentials found, redirecting to login...");
          window.location.href = "../../index.html";
          return;
        }

        console.log("[Fleetrack Auth] Credentials found:", { hasApiKey: !!hasApiKey, hasUserEmail: !!hasUserEmail, hasOmnisUser: !!hasOmnisUser, isFleetrackSession });
      }
    }

    function doLogout() {
      if (confirm("Log out?")) {
        localStorage.removeItem("ft_api_key");
        localStorage.removeItem("ft_api_secret");
        localStorage.removeItem("ft_user_email");
        if (window.frappeAPI && window.frappeAPI.openLogin) {
          window.frappeAPI.openLogin();
        } else {
          window.location.href = "../../index.html";
        }
      }
    }

    async function addToServicePlan(machineName) {
      if (!machineName) return;

      showToast("Adding " + machineName + " to plan...", "info");

      try {
        const result = await callFrappe(FT_ADD_SERVICE_PLAN_METHOD, {
          machine: machineName,
          description: "Service Due",
          planned_date: frappe.datetime.get_today()
        }, 'POST');

        if (result && result.message && result.message.status === "success") {
          showToast("✅ Added to Service Plan", "ok");

          // If we are on the FSP view, refresh it
          if (!document.getElementById("view-fsi").classList.contains("hidden")) {
            loadFieldServicePlan();
          }
        } else {
          // Try to get error from standard Frappe response format or our custom format
          let errMsg = "Failed";
          if (result.message && result.message.message) errMsg = result.message.message;
          else if (result.message && result.message.error) errMsg = result.message.error;
          else if (result.error) errMsg = result.error;
          else if (result._server_messages) {
            try {
              const msgs = JSON.parse(result._server_messages);
              errMsg = msgs.map(m => JSON.parse(m).message).join(", ");
            } catch (e) { }
          }

          console.error("FSP Add Failed:", result);
          showToast("❌ " + errMsg, "error");
        }
      } catch (e) {
        console.error(e);
        showToast("❌ Error adding to plan", "error");
      }
    }

    async function loadFieldServicePlan() {
      const tbody = document.getElementById("tbl-fsi");
      if (!tbody) return;

      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">Loading plan...</td></tr>`;

      try {
        const filters = {
          region: document.getElementById("fsp-filter-region")?.value || "",
          customer: document.getElementById("fsp-filter-customer")?.value || "",
          machine: document.getElementById("fsp-filter-machine")?.value || "",
          status: document.getElementById("fsp-filter-status")?.value || ""
        };

        const result = await callFrappe(FT_GET_SERVICE_PLAN_LIST_METHOD, filters);

        // Check for backend errors
        if (result.error) throw new Error(result.error);
        if (result.message && result.message.error) throw new Error(result.message.error);

        const rows = result.message || [];
        
        // Update Weekly Calendar
        renderFspWeeklyCalendar(rows);

        if (rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">No planned jobs found. Connect FSI data or add machines from Register.</td></tr>`;
          return;
        }

        tbody.innerHTML = "";
        rows.forEach(r => {
          const tr = document.createElement("tr");
          tr.style.borderBottom = "1px solid #f1f5f9";
          tr.style.cursor = "pointer";
          tr.setAttribute("data-name", r.name || "");
          tr.setAttribute("data-machine", r.machine || "");
          
          // Shield row click from delete button
          tr.onclick = (e) => {
            if (e.target.closest(".fsp-row-del-btn")) return;
            openFspDetailModal(r);
          };

          tr.innerHTML = `
                  <td style="padding:10px 16px;"><div style="font-weight:600; color:#1e293b;">${safeText(r.customer)}</div></td>
                  <td style="padding:10px 16px;"><div style="font-weight:600; color:#334155;">${safeText(r.machine)}</div></td>
                  <td style="padding:10px 16px;">${safeText(r.description)}</td>
                  <td style="padding:10px 16px; color:#64748b;">${safeText(r.location)}</td>
                  <td style="padding:10px 16px;">
                    <span style="display:inline-flex; align-items:center; gap:4px; background:#f8fafc; padding:2px 8px; border-radius:12px; border:1px solid #e2e8f0; font-size:9px; color:#475569;">
                      <span style="color:#ef4444;">👤</span> ${safeText(r.technician || "Unassigned")}
                    </span>
                  </td>
                  <td style="padding:10px 16px; color:#64748b; font-size:9px; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeText(r.defects || "—")}</td>
                  <td style="padding:10px 16px;">
                    <span style="font-size:9px; padding:2px 6px; border-radius:4px; font-weight:600; 
                      background:${(r.warranty_status || "").toLowerCase().includes("active") ? "#dcfce7" : "#fef2f2"}; 
                      color:${(r.warranty_status || "").toLowerCase().includes("active") ? "#166534" : "#991b1b"};">
                      ${safeText(r.warranty_status || "Out of Warranty")}
                    </span>
                  </td>
                  <td style="padding:10px 16px; font-weight:600; color:#334155;">${safeText(r.plan_for)}</td>
                  <td style="padding:10px 16px;">
                    <select 
                      onchange="updateFspStatusInline('${r.name}', this.value)" 
                      onclick="event.stopPropagation()"
                      style="
                        padding:4px 8px; border-radius:12px; font-size:9px; font-weight:700; text-transform:uppercase; border:none; cursor:pointer; outline:none;
                        background: ${r.status === 'Proposed' ? '#f1f5f9' : r.status === 'Planned' ? '#eff6ff' : r.status === 'In Progress' ? '#fef9c3' : '#dcfce7'};
                        color: ${r.status === 'Proposed' ? '#64748b' : r.status === 'Planned' ? '#2563eb' : r.status === 'In Progress' ? '#854d0e' : '#166534'};
                      ">
                      <option value="Proposed" ${r.status === 'Proposed' ? 'selected' : ''}>Proposed</option>
                      <option value="Planned" ${r.status === 'Planned' ? 'selected' : ''}>Planned</option>
                      <option value="In Progress" ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                      <option value="Completed" ${r.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                  </td>
                  <td style="padding:10px 16px; text-align:center;">
                    <button class="fsp-row-del-btn"
                      onclick="event.stopPropagation()"
                      title="Delete Entry"
                      style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:8px; cursor:pointer; line-height:1; font-size:14px; transition:all 0.2s; position:relative; z-index:10; pointer-events:auto !important;">
                      🗑️
                    </button>
                  </td>
                `;
          tbody.appendChild(tr);
        });

      } catch (e) {
        console.error(e);
        let failMsg = e.message || e.toString();
        // Handle frappe server messages if present in error object
        if (e._server_messages) {
          try {
            failMsg = JSON.parse(e._server_messages).map(m => JSON.parse(m).message).join(", ");
          } catch (x) { }
        }
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Error: ${failMsg}</td></tr>`;
      }
    }
    // Ensure globally available for hoisted logic
    window.loadFieldServicePlan = loadFieldServicePlan;

    // ============================================================
    // HMR ACTIVITY REPORT
    // ============================================================
    const FT_HMR_ACTIVITY_METHOD = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_hmr_activity_report";

    let HMR_ACTIVITY_DATA = []; // cache for export/print

    function openHmrActivityReport() {
      const overlay = document.getElementById("hmr-activity-overlay");
      if (!overlay) return;

      // Default to current month
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const firstDay = `${y}-${m}-01`;
      const lastDay  = new Date(y, now.getMonth() + 1, 0).toISOString().split("T")[0];

      const fromEl = document.getElementById("hmr-act-from");
      const toEl   = document.getElementById("hmr-act-to");
      if (fromEl && !fromEl.value) fromEl.value = firstDay;
      if (toEl   && !toEl.value)   toEl.value   = lastDay;

      overlay.classList.remove("hidden");
      overlay.style.display = "flex";
    }

    function closeHmrActivityReport() {
      const overlay = document.getElementById("hmr-activity-overlay");
      if (overlay) {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
      }
    }

    async function runHmrActivityReport() {
      const dateFrom   = document.getElementById("hmr-act-from")?.value;
      const dateTo     = document.getElementById("hmr-act-to")?.value;
      const region     = document.getElementById("hmr-act-region")?.value || "";
      const customer   = document.getElementById("hmr-act-customer")?.value || "";

      if (!dateFrom || !dateTo) {
        alert("Please select both a From and To date.");
        return;
      }

      const stateEl = document.getElementById("hmr-act-state");
      const tableEl = document.getElementById("hmr-act-table");
      const summEl  = document.getElementById("hmr-act-summary");

      stateEl.textContent = "⏳ Loading HMR activity data...";
      stateEl.style.display = "block";
      tableEl.classList.add("hidden");
      if (summEl) summEl.style.display = "none";

      try {
        const result = await callFrappe(FT_HMR_ACTIVITY_METHOD, { date_from: dateFrom, date_to: dateTo, region, customer });
        const data = result.message || result;

        if (data.error) throw new Error(data.error);

        let rows = data.rows || [];
        rows.sort((a, b) => (a.customer || "").localeCompare(b.customer || ""));
        HMR_ACTIVITY_DATA = rows;

        if (rows.length === 0) {
          stateEl.textContent = "No HMR updates found for the selected period.";
          stateEl.style.display = "block";
          return;
        }

        // Summary bar
        const totalLogs = rows.reduce((s, r) => s + r.update_count, 0);
        const avg = (totalLogs / rows.length).toFixed(1);
        document.getElementById("hmr-act-sum-period").textContent  = `${dateFrom} → ${dateTo}`;
        document.getElementById("hmr-act-sum-total").textContent   = rows.length;
        document.getElementById("hmr-act-sum-logs").textContent    = totalLogs;
        document.getElementById("hmr-act-sum-avg").textContent     = avg;
        if (summEl) summEl.style.display = "block";

        // Render table
        const tbody = document.getElementById("hmr-act-tbody");
        tbody.innerHTML = "";
        
        let customerRowSpans = {};
        rows.forEach(r => {
           let c = r.customer || "Unknown";
           customerRowSpans[c] = (customerRowSpans[c] || 0) + 1;
        });

        let renderedCustomers = new Set();

        rows.forEach((r, i) => {
          const tr = document.createElement("tr");
          tr.style.cssText = "border-bottom:1px solid #1e293b;";
          tr.onmouseover = () => tr.style.background = "#1e2d3d";
          tr.onmouseout  = () => tr.style.background = "";

          const c = r.customer || "Unknown";
          const isFirstOfCustomer = !renderedCustomers.has(c);
          if (isFirstOfCustomer) renderedCustomers.add(c);

          // Color-code update count
          const countColor = r.update_count >= 5 ? "#34d399" : r.update_count >= 2 ? "#fbbf24" : "#94a3b8";
          // Color-code HMR delta
          const delta = r.hmr_change;
          const deltaColor = delta > 100 ? "#34d399" : delta > 0 ? "#94a3b8" : "#ef4444";
          const deltaStr   = delta != null ? `+${delta}` : "—";
          
          let customerCellHTML = "";
          if (isFirstOfCustomer) {
            customerCellHTML = `<td rowspan="${customerRowSpans[c]}" style="padding:10px 12px; color:#e2e8f0; font-weight:700; border-right:1px solid #334155; vertical-align:top; background:rgba(255,255,255,0.02);">${safeText(r.customer)}</td>`;
            tr.style.borderTop = "2px solid #334155";
          }

          tr.innerHTML = `
            <td style="padding:10px 12px; color:#475569;">${i + 1}</td>
            ${customerCellHTML}
            <td style="padding:10px 12px;">
              <div style="font-weight:700; color:#f1f5f9;">${safeText(r.machine)}</div>
              ${r.fleet_no !== "—" ? `<div style="font-size:9px; color:#64748b;">Fleet: ${safeText(r.fleet_no)}</div>` : ""}
            </td>
            <td style="padding:10px 12px; color:#cbd5e1;">${safeText(r.model)}</td>
            <td style="padding:10px 12px; color:#94a3b8;">${safeText(r.region)}</td>
            <td style="padding:10px 12px; text-align:center;">
              <span style="display:inline-block; background:${r.update_count >= 5 ? '#0d3321' : r.update_count >= 2 ? '#3a2800' : '#1e293b'}; color:${countColor}; font-weight:800; font-size:14px; padding:2px 10px; border-radius:20px;">${r.update_count}</span>
            </td>
            <td style="padding:10px 12px; text-align:right; color:#94a3b8; font-family:monospace;">${r.hmr_start != null ? r.hmr_start.toLocaleString() : "—"}</td>
            <td style="padding:10px 12px; text-align:right; color:#e2e8f0; font-weight:700; font-family:monospace;">${r.hmr_end != null ? r.hmr_end.toLocaleString() : "—"}</td>
            <td style="padding:10px 12px; text-align:right; color:${deltaColor}; font-weight:700; font-family:monospace;">${deltaStr}</td>
            <td style="padding:10px 12px; color:#64748b; font-size:10px;">${safeText(r.first_update_date)}</td>
            <td style="padding:10px 12px; color:#7dd3fc; font-size:10px;">${safeText(r.last_update_date)}</td>
            <td style="padding:10px 12px; color:#94a3b8; font-size:10px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${safeText(r.loggers)}">${safeText(r.loggers)}</td>
          `;
          tbody.appendChild(tr);
        });

        stateEl.style.display = "none";
        tableEl.classList.remove("hidden");

      } catch (err) {
        stateEl.textContent = `Error: ${err.message || err}`;
        stateEl.style.display = "block";
      }
    }

    function exportHmrActivityCsv() {
      if (!HMR_ACTIVITY_DATA.length) { alert("Generate the report first."); return; }
      const headers = ["#","Customer","Machine","Model","Region","Fleet No","Updates","HMR Start","HMR End","HMR Change","First Update","Last Update","Logger(s)"];
      const rows = HMR_ACTIVITY_DATA.map((r, i) => [
        i+1, r.customer, r.machine, r.model, r.region, r.fleet_no,
        r.update_count, r.hmr_start ?? "", r.hmr_end ?? "", r.hmr_change ?? "",
        r.first_update_date, r.last_update_date, r.loggers
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const from = document.getElementById("hmr-act-from")?.value || "from";
      const to   = document.getElementById("hmr-act-to")?.value   || "to";
      a.download = `HMR_Activity_${from}_to_${to}.csv`;
      a.click();
    }

    function printHmrActivityReport() {
      if (!HMR_ACTIVITY_DATA.length) { alert("Generate the report first."); return; }
      const from = document.getElementById("hmr-act-from")?.value || "";
      const to   = document.getElementById("hmr-act-to")?.value   || "";
      const rows = HMR_ACTIVITY_DATA;
      const tableRows = rows.map((r, i) => `
        <tr>
          <td>${i+1}</td>
          <td>${r.customer}</td>
          <td><strong>${r.machine}</strong>${r.fleet_no !== "—" ? ` <small>(Fleet: ${r.fleet_no})</small>` : ""}</td>
          <td>${r.model}</td>
          <td>${r.region}</td>
          <td style="text-align:center; font-weight:bold; color:${r.update_count >= 5 ? "green" : r.update_count >= 2 ? "darkorange" : "gray"}">${r.update_count}</td>
          <td style="text-align:right;">${r.hmr_start ?? "—"}</td>
          <td style="text-align:right; font-weight:bold;">${r.hmr_end ?? "—"}</td>
          <td style="text-align:right; color:${(r.hmr_change||0) > 0 ? "green" : "red"}; font-weight:bold;">+${r.hmr_change ?? "—"}</td>
          <td>${r.first_update_date}</td>
          <td>${r.last_update_date}</td>
          <td style="font-size:9px;">${r.loggers}</td>
        </tr>`).join("");

      const win = window.open("", "_blank");
      win.document.write(`
        <!DOCTYPE html><html><head><title>HMR Activity Report ${from} to ${to}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p.sub { color: #666; font-size: 11px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1e293b; color: white; padding: 8px 10px; text-align: left; font-size: 10px; }
          td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f8fafc; }
          @media print { body { padding: 0; } }
            /* Frameless window dragging and controls */
        .sidebar-brand {
            -webkit-app-region: drag;
            cursor: move;
        }

        .nav-item, .utility-item, .btn-primary, .win-btn-dash {
            -webkit-app-region: no-drag !important;
        }

        .win-controls-dash {
            display: flex;
            gap: 12px;
            margin-left: 15px;
            padding-left: 15px;
            border-left: 1px solid var(--border-color);
        }

        .win-btn-dash {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .win-btn-dash:hover {
            color: var(--text-main);
            transform: scale(1.1);
        }

        .win-btn-dash.close:hover {
            color: #ef4444;
        }
    </style></head><body>
        <h1>📊 HMR Activity Report</h1>
        <p class="sub">Period: <strong>${from}</strong> to <strong>${to}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Machines: <strong>${rows.length}</strong></p>
        <table>
          <thead><tr>
            <th>#</th><th>Customer</th><th>Machine</th><th>Model</th><th>Region</th>
            <th>Updates</th><th>HMR Start</th><th>HMR End</th><th>Δ HMR</th>
            <th>First Update</th><th>Last Update</th><th>Logger(s)</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        \x3cscript>window.onload=()=>window.print();\x3c/script>
        </body></html>`);
      win.document.close();
    }

    window.openHmrActivityReport  = openHmrActivityReport;
    window.closeHmrActivityReport = closeHmrActivityReport;
    window.runHmrActivityReport   = runHmrActivityReport;
    window.exportHmrActivityCsv   = exportHmrActivityCsv;
    window.printHmrActivityReport = printHmrActivityReport;

    // Wire up events
    document.addEventListener("DOMContentLoaded", () => {
      checkLoginAndInit();
      requestNotificationPermission(); // Ask for notification permission early

      const logoutBtn = document.getElementById("menu-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", doLogout);
      }

      // Check for Supervisor Alerts (Popup)
      checkSupervisorPopup();

      // Wire up New Breakdown Button
      const newBreakdownBtn = document.getElementById("btn-primary-action");
      if (newBreakdownBtn) {
        // Remove potential existing onclick to avoid conflicts
        newBreakdownBtn.removeAttribute("onclick");
        newBreakdownBtn.addEventListener("click", window.openCreateModal);
      }

      // Wire up New Job Card Button
      const jcBtn = document.getElementById("btn-new-job-card");
      if (jcBtn) {
        jcBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("New Job Card button clicked");
          if (typeof window.triggerJCCreationModal === "function") {
            window.triggerJCCreationModal();
          } else {
            console.error("triggerJCCreationModal not found");
          }
        });
      }
    });

    // Fallback if DOMContentLoaded already fired
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(checkLoginAndInit, 100);
      setTimeout(checkSupervisorPopup, 1000);
    }

    async function checkSupervisorPopup() {
      // Avoid checking if not logged in (rudimentary check logic reuse)
      const hasAuth = localStorage.getItem("ft_api_key") || localStorage.getItem("ft_user_email") || localStorage.getItem("omnisUser");
      if (!hasAuth && window.location.origin.startsWith("file")) return;

      try {
        // Fetch DBR data to check counts
        // Reuse global method constant if available, else hardcode for safety
        const method = (typeof FT_BREAKDOWN_DBR_METHOD !== 'undefined') ? FT_BREAKDOWN_DBR_METHOD : "mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_breakdown_dbr_v2";

        const res = await callFrappe(method, { _ts: Date.now() });
        const data = res.message || {};
        const breakdowns = data.breakdowns || [];

        const count = breakdowns.filter(b => b.supervisor_approved == 1 && (!b.sent_to_customer || b.sent_to_customer == 0)).length;

        if (count > 0) {
          const modal = document.getElementById("modal-sup-alert");
          const countEl = document.getElementById("sup-alert-count");
          if (modal && countEl) {
            countEl.textContent = count;
            modal.classList.remove("hidden");

            // Wire buttons
            document.getElementById("btn-sup-alert-view").onclick = () => {
              modal.classList.add("hidden");
              // Navigate to DBR View
              const dbrNav = document.querySelector('[data-view="view-reports"]');
              if (dbrNav) dbrNav.click();
            };

            document.getElementById("btn-sup-alert-close").onclick = () => {
              modal.classList.add("hidden");
            };
          }
        }
      } catch (e) {
        console.error("Popup check failed", e);
      }
    }

    /**
     * GLOBAL DELETION HANDLERS
     */
    window.closeHmrDeleteModal = function() {
      const modal = document.getElementById("fsp-delete-confirm-overlay");
      if (modal) modal.classList.add("hidden");
    };

    window.executeDeleteFsp = async function(name) {
      if (!name) return;
      try {
        if (typeof showToast === 'function') showToast("Deleting entry...", "info");
        const res = await callFrappe("mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.delete_ft_service_plan_entry", { name: name });
        if (res.status === "success" || (res.message && res.message.status === "success")) {
          if (typeof showToast === 'function') showToast("Entry deleted successfully", "success");
          window.closeHmrDeleteModal();
          if (window.loadFieldServicePlan) window.loadFieldServicePlan(); 
        } else {
          if (typeof showToast === 'function') showToast("Delete failed", "error");
        }
      } catch (err) {
        if (typeof showToast === 'function') showToast("Error connecting to server", "error");
      }
    };